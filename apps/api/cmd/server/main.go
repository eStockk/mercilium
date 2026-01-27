package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type Config struct {
	BindAddr      string
	MongoURI      string
	MongoDB       string
	UploadsDir    string
	SessionTTL    time.Duration
	CookieSecure  bool
	AdminUser     string
	AdminPassword string
	AllowCORS     bool
}

type App struct {
	cfg        Config
	db         *mongo.Database
	users      *mongo.Collection
	posts      *mongo.Collection
	tags       *mongo.Collection
	categories *mongo.Collection
	sessions   *mongo.Collection
	counters   *mongo.Collection
}

type User struct {
	ID        interface{} `bson:"_id" json:"id"`
	Username  string      `bson:"username" json:"username"`
	Password  string      `bson:"password" json:"-"`
	Role      string      `bson:"role" json:"role"`
	CreatedAt time.Time   `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time   `bson:"updated_at" json:"updated_at"`
}

type Category struct {
	Name    string `bson:"name" json:"name"`
	Content string `bson:"content" json:"content"`
}

type Post struct {
	ID         int64      `bson:"_id" json:"id"`
	Title      string     `bson:"title" json:"title"`
	Content    string     `bson:"content" json:"content"`
	Type       string     `bson:"type" json:"type"`
	SourceID   *int64     `bson:"source_id,omitempty" json:"source_id,omitempty"`
	Status     string     `bson:"status" json:"status"`
	Tags       []string   `bson:"tags,omitempty" json:"tags"`
	Categories []Category `bson:"categories,omitempty" json:"categories,omitempty"`
	CreatedAt  time.Time  `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time  `bson:"updated_at" json:"updated_at"`
}

type Session struct {
	ID        string      `bson:"_id"`
	UserID    interface{} `bson:"user_id"`
	CreatedAt time.Time   `bson:"created_at"`
	ExpiresAt time.Time   `bson:"expires_at"`
}

func main() {
	cfg := loadConfig()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}

	db := client.Database(cfg.MongoDB)
	app := &App{
		cfg:        cfg,
		db:         db,
		users:      db.Collection("users"),
		posts:      db.Collection("posts"),
		tags:       db.Collection("tags"),
		categories: db.Collection("categories"),
		sessions:   db.Collection("sessions"),
		counters:   db.Collection("counters"),
	}

	if err := app.ensureIndexes(); err != nil {
		log.Printf("warn: ensure indexes: %v", err)
	}

	if err := app.ensureAdmin(); err != nil {
		log.Printf("warn: ensure admin: %v", err)
	}

	if err := os.MkdirAll(cfg.UploadsDir, 0o755); err != nil {
		log.Fatalf("uploads dir: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	})

	r.Route("/api", func(api chi.Router) {
		api.Route("/auth", func(ar chi.Router) {
			ar.Post("/login", app.handleAuthLogin)
			ar.Post("/logout", app.handleAuthLogout)
			ar.Get("/me", app.handleAuthMe)
		})

		api.Route("/public", func(pr chi.Router) {
			pr.Get("/posts", app.handlePublicPosts)
			pr.Get("/posts/{id}", app.handlePublicPost)
			pr.Get("/tags", app.handlePublicTags)
		})

		api.Route("/admin", func(ad chi.Router) {
			ad.Use(app.requireAuth)
			ad.Get("/summary", app.handleAdminSummary)
			ad.Get("/posts", app.handleAdminPostsList)
			ad.Get("/posts/{id}", app.handleAdminPostGet)
			ad.Post("/posts", app.handleAdminPostUpsert)
			ad.Delete("/posts/{id}", app.handleAdminPostDelete)
			ad.Post("/upload", app.handleUpload)
			ad.Get("/tags", app.handleAdminTagsList)
			ad.Post("/tags", app.handleAdminTagsCreate)
			ad.Get("/categories", app.handleAdminCategoriesList)
			ad.Post("/categories", app.handleAdminCategoriesCreate)
		})
	})

	// Legacy public API compatibility
	r.Get("/backside/api/get_posts.php", app.handlePublicPosts)
	r.Get("/backside/api/get_post.php", app.handlePublicPostLegacy)
	r.Get("/backside/api/get_tags.php", app.handlePublicTags)

	// Legacy admin API compatibility
	r.Get("/dbauth/pages/api/get_posts.php", app.handleAdminSummary)
	r.Route("/dbauth/pages/api/posts.php", func(ar chi.Router) {
		ar.With(app.requireAuth).Get("/", app.handleAdminPostsLegacy)
		ar.With(app.requireAuth).Post("/", app.handleAdminPostUpsert)
	})
	r.With(app.requireAuth).Get("/dbauth/pages/api/tags.php", app.handleAdminTagsList)
	r.With(app.requireAuth).Post("/dbauth/pages/api/tags.php", app.handleAdminTagsCreate)
	r.With(app.requireAuth).Get("/dbauth/pages/api/categories.php", app.handleAdminCategoriesList)
	r.With(app.requireAuth).Post("/dbauth/pages/api/categories.php", app.handleAdminCategoriesCreate)
	r.With(app.requireAuth).Post("/dbauth/pages/api/upload.php", app.handleUpload)

	log.Printf("api listening on %s", cfg.BindAddr)
	if err := http.ListenAndServe(cfg.BindAddr, r); err != nil {
		log.Fatalf("listen: %v", err)
	}
}

func loadConfig() Config {
	return Config{
		BindAddr:      envOr("BIND_ADDR", ":8080"),
		MongoURI:      envOr("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:       envOr("MONGO_DB", "mercilium"),
		UploadsDir:    envOr("UPLOAD_DIR", "./uploads"),
		SessionTTL:    time.Duration(envIntOr("SESSION_TTL_HOURS", 168)) * time.Hour,
		CookieSecure:  envBool("COOKIE_SECURE", false),
		AdminUser:     envOr("ADMIN_USER", "admin"),
		AdminPassword: envOr("ADMIN_PASSWORD", "Hgasrfw31"),
		AllowCORS:     envBool("ALLOW_CORS", false),
	}
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func envIntOr(key string, def int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func envBool(key string, def bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	v = strings.ToLower(v)
	return v == "1" || v == "true" || v == "yes"
}

func (a *App) ensureIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, _ = a.sessions.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.M{"expires_at": 1},
		Options: options.Index().SetExpireAfterSeconds(0),
	})

	_, _ = a.posts.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.M{"created_at": -1},
	})

	_, _ = a.posts.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.M{"tags": 1},
	})

	_, _ = a.posts.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.M{"title": "text"},
	})

	return nil
}

func (a *App) ensureAdmin() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user User
	err := a.users.FindOne(ctx, bson.M{"username": a.cfg.AdminUser}).Decode(&user)
	if err == nil {
		return nil
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(a.cfg.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	_, err = a.users.InsertOne(ctx, bson.M{
		"username":   a.cfg.AdminUser,
		"password":   string(hash),
		"role":       "admin",
		"created_at": now,
		"updated_at": now,
	})
	return err
}

func (a *App) nextPostID(ctx context.Context) (int64, error) {
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var doc struct {
		Seq int64 `bson:"seq"`
	}
	err := a.counters.FindOneAndUpdate(
		ctx,
		bson.M{"_id": "posts"},
		bson.M{"$inc": bson.M{"seq": 1}},
		opts,
	).Decode(&doc)
	if err != nil {
		return 0, err
	}
	return doc.Seq, nil
}

func (a *App) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := a.getUserFromRequest(r)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) getUserFromRequest(r *http.Request) (*User, error) {
	cookie, err := r.Cookie("sid")
	if err != nil || cookie.Value == "" {
		return nil, errors.New("missing session")
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var session Session
	if err := a.sessions.FindOne(ctx, bson.M{"_id": cookie.Value}).Decode(&session); err != nil {
		return nil, err
	}
	if time.Now().After(session.ExpiresAt) {
		_, _ = a.sessions.DeleteOne(ctx, bson.M{"_id": cookie.Value})
		return nil, errors.New("session expired")
	}

	var user User
	if err := a.users.FindOne(ctx, bson.M{"_id": session.UserID}).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (a *App) handleAuthLogin(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "bad json"})
		return
	}
	payload.Login = strings.TrimSpace(payload.Login)
	if payload.Login == "" || payload.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Логин и пароль обязательны"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var user User
	if err := a.users.FindOne(ctx, bson.M{"username": payload.Login}).Decode(&user); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "Пользователь не найден"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(payload.Password)) != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "Неверный пароль"})
		return
	}

	token, err := randomToken(32)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "token error"})
		return
	}

	now := time.Now().UTC()
	expires := now.Add(a.cfg.SessionTTL)
	_, err = a.sessions.InsertOne(ctx, Session{
		ID:        token,
		UserID:    user.ID,
		CreatedAt: now,
		ExpiresAt: expires,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "session error"})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "sid",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.cfg.CookieSecure,
		Expires:  expires,
	})

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) handleAuthLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("sid")
	if err == nil && cookie.Value != "" {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		_, _ = a.sessions.DeleteOne(ctx, bson.M{"_id": cookie.Value})
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "sid",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   a.cfg.CookieSecure,
	})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) handleAuthMe(w http.ResponseWriter, r *http.Request) {
	user, err := a.getUserFromRequest(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true,
		"user": map[string]any{
			"username": user.Username,
			"role":     user.Role,
		},
	})
}

func (a *App) handlePublicTags(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cursor, err := a.posts.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$unwind", Value: "$tags"}},
		{{Key: "$group", Value: bson.M{"_id": "$tags", "cnt": bson.M{"$sum": 1}}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	})
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "tags": []string{}})
		return
	}
	defer cursor.Close(ctx)

	tags := []string{}
	for cursor.Next(ctx) {
		var row struct {
			ID string `bson:"_id"`
		}
		if err := cursor.Decode(&row); err == nil {
			tags = append(tags, row.ID)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "tags": tags})
}

func (a *App) handlePublicPosts(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	tagsParam := strings.TrimSpace(r.URL.Query().Get("tags"))
	var tags []string
	if tagsParam != "" {
		for _, t := range strings.Split(tagsParam, ",") {
			if tt := strings.TrimSpace(t); tt != "" {
				tags = append(tags, tt)
			}
		}
	}

	filter := bson.M{"status": "published"}
	if search != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": search, "$options": "i"}},
			{"tags": bson.M{"$regex": search, "$options": "i"}},
		}
	}
	if len(tags) > 0 {
		filter["tags"] = bson.M{"$all": tags}
	}

	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cur, err := a.posts.Find(ctx, filter, opts)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	defer cur.Close(ctx)

	var guides []map[string]any
	var sources []map[string]any
	for cur.Next(ctx) {
		var p Post
		if err := cur.Decode(&p); err != nil {
			continue
		}
		item := map[string]any{
			"id":         p.ID,
			"title":      p.Title,
			"content":    p.Content,
			"type":       p.Type,
			"source_id":  p.SourceID,
			"created_at": p.CreatedAt,
			"tags":       strings.Join(p.Tags, ", "),
		}
		if p.Type == "source" {
			sources = append(sources, item)
		} else {
			guides = append(guides, item)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"guides":  guides,
		"sources": sources,
	})
}

func (a *App) handlePublicPostLegacy(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "id required"})
		return
	}
	r = r.Clone(r.Context())
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", idStr)
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
	a.handlePublicPost(w, r)
}

func (a *App) handlePublicPost(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid id"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	var post Post
	if err := a.posts.FindOne(ctx, bson.M{"_id": id}).Decode(&post); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "post not found"})
		return
	}

	var linkedSources []map[string]any
	if post.Type == "guide" && post.SourceID != nil {
		var src Post
		if err := a.posts.FindOne(ctx, bson.M{"_id": *post.SourceID}).Decode(&src); err == nil {
			linkedSources = append(linkedSources, map[string]any{
				"id":         src.ID,
				"title":      src.Title,
				"tags":       src.Tags,
				"created_at": src.CreatedAt,
			})
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true,
		"post": map[string]any{
			"id":           post.ID,
			"title":        post.Title,
			"content":      post.Content,
			"content_html": post.Content,
			"type":         post.Type,
			"source_id":    post.SourceID,
			"status":       post.Status,
			"created_at":   post.CreatedAt,
			"tags":         post.Tags,
			"categories":   post.Categories,
		},
		"linked_sources": linkedSources,
	})
}

func (a *App) handleAdminSummary(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cur, err := a.posts.Find(ctx, bson.M{"status": "published"}, opts)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	defer cur.Close(ctx)

	var guides []map[string]any
	var sources []map[string]any
	for cur.Next(ctx) {
		var p Post
		if err := cur.Decode(&p); err != nil {
			continue
		}
		item := map[string]any{
			"id":         p.ID,
			"title":      p.Title,
			"content":    p.Content,
			"type":       p.Type,
			"created_at": p.CreatedAt,
			"tags":       strings.Join(p.Tags, ", "),
		}
		if p.Type == "source" {
			sources = append(sources, item)
		} else {
			guides = append(guides, item)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"guides":  guides,
		"sources": sources,
	})
}

func (a *App) handleAdminPostsList(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	postType := strings.TrimSpace(r.URL.Query().Get("type"))

	filter := bson.M{}
	if status != "" && status != "all" {
		filter["status"] = status
	}
	if postType != "" && postType != "all" {
		filter["type"] = postType
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.M{"created_at": -1})
	cur, err := a.posts.Find(ctx, filter, opts)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	defer cur.Close(ctx)

	var posts []map[string]any
	for cur.Next(ctx) {
		var p Post
		if err := cur.Decode(&p); err != nil {
			continue
		}
		posts = append(posts, map[string]any{
			"id":         p.ID,
			"title":      p.Title,
			"content":    p.Content,
			"type":       p.Type,
			"status":     p.Status,
			"created_at": p.CreatedAt,
			"source_id":  p.SourceID,
			"tags":       strings.Join(p.Tags, ", "),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "posts": posts})
}

func (a *App) handleAdminPostsLegacy(w http.ResponseWriter, r *http.Request) {
	action := r.URL.Query().Get("action")
	switch action {
	case "list":
		a.handleAdminPostsList(w, r)
		return
	case "get":
		id := r.URL.Query().Get("id")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", id)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
		a.handleAdminPostGet(w, r)
		return
	case "delete":
		id := r.URL.Query().Get("id")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", id)
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
		a.handleAdminPostDelete(w, r)
		return
	default:
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "unknown action"})
	}
}

func (a *App) handleAdminPostGet(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid id"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	var post Post
	if err := a.posts.FindOne(ctx, bson.M{"_id": id}).Decode(&post); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "post not found"})
		return
	}

	var source map[string]any
	if post.Type == "guide" && post.SourceID != nil {
		var src Post
		if err := a.posts.FindOne(ctx, bson.M{"_id": *post.SourceID}).Decode(&src); err == nil {
			source = map[string]any{"id": src.ID, "title": src.Title}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok": true,
		"post": map[string]any{
			"id":         post.ID,
			"title":      post.Title,
			"content":    post.Content,
			"type":       post.Type,
			"status":     post.Status,
			"created_at": post.CreatedAt,
			"source_id":  post.SourceID,
			"tags":       post.Tags,
			"categories": post.Categories,
			"source":     source,
		},
	})
}

func (a *App) handleAdminPostUpsert(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid form"})
		return
	}

	action := strings.TrimSpace(r.FormValue("action"))
	title := strings.TrimSpace(r.FormValue("title"))
	content := strings.TrimSpace(r.FormValue("content"))
	postType := strings.TrimSpace(r.FormValue("type"))
	status := strings.TrimSpace(r.FormValue("mode"))
	if postType == "" {
		postType = "guide"
	}
	if status == "" {
		status = "published"
	}

	if title == "" || content == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Empty title or content"})
		return
	}

	var tags []string
	if raw := r.FormValue("tags"); raw != "" {
		_ = json.Unmarshal([]byte(raw), &tags)
	}
	var categories []Category
	if raw := r.FormValue("categories"); raw != "" {
		_ = json.Unmarshal([]byte(raw), &categories)
	}
	var sourceID *int64
	if src := strings.TrimSpace(r.FormValue("source_id")); src != "" {
		if id, err := strconv.ParseInt(src, 10, 64); err == nil {
			sourceID = &id
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	now := time.Now().UTC()
	if action == "update" {
		idStr := r.FormValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid id"})
			return
		}

		update := bson.M{
			"title":      title,
			"content":    content,
			"type":       postType,
			"status":     status,
			"tags":       tags,
			"categories": categories,
			"source_id":  sourceID,
			"updated_at": now,
		}
		_, err = a.posts.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": err.Error()})
			return
		}
		a.ensureTagCategoryDocs(ctx, tags, categories)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
		return
	}

	if action != "create" && action != "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Unknown action"})
		return
	}

	id, err := a.nextPostID(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": err.Error()})
		return
	}

	post := Post{
		ID:         id,
		Title:      title,
		Content:    content,
		Type:       postType,
		Status:     status,
		Tags:       tags,
		Categories: categories,
		SourceID:   sourceID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if _, err := a.posts.InsertOne(ctx, post); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	a.ensureTagCategoryDocs(ctx, tags, categories)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
}

func (a *App) handleAdminPostDelete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid id"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	_, err = a.posts.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": err.Error()})
		return
	}

	uploadsDir := filepath.Join(a.cfg.UploadsDir, fmt.Sprintf("%d", id))
	_ = os.RemoveAll(uploadsDir)

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "deleted": id})
}

func (a *App) handleAdminTagsList(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	cursor, err := a.posts.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$unwind", Value: "$tags"}},
		{{Key: "$group", Value: bson.M{"_id": "$tags", "cnt": bson.M{"$sum": 1}}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	})
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "tags": []any{}})
		return
	}
	defer cursor.Close(ctx)

	var tags []map[string]any
	for cursor.Next(ctx) {
		var row struct {
			ID  string `bson:"_id"`
			Cnt int    `bson:"cnt"`
		}
		if err := cursor.Decode(&row); err == nil {
			tags = append(tags, map[string]any{
				"id":   row.ID,
				"name": row.ID,
				"cnt":  row.Cnt,
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "tags": tags})
}

func (a *App) handleAdminTagsCreate(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		var body struct {
			Name string `json:"name"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		name = strings.TrimSpace(body.Name)
	}
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Название тега пустое"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	_, _ = a.tags.UpdateOne(ctx, bson.M{"_id": name}, bson.M{"$setOnInsert": bson.M{"name": name}}, options.Update().SetUpsert(true))
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": name, "name": name})
}

func (a *App) handleAdminCategoriesList(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	cursor, err := a.posts.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$unwind", Value: "$categories"}},
		{{Key: "$group", Value: bson.M{"_id": "$categories.name", "cnt": bson.M{"$sum": 1}}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	})
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "categories": []any{}})
		return
	}
	defer cursor.Close(ctx)

	var categories []map[string]any
	for cursor.Next(ctx) {
		var row struct {
			ID  string `bson:"_id"`
			Cnt int    `bson:"cnt"`
		}
		if err := cursor.Decode(&row); err == nil {
			categories = append(categories, map[string]any{
				"id":   row.ID,
				"name": row.ID,
				"cnt":  row.Cnt,
			})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "categories": categories})
}

func (a *App) handleAdminCategoriesCreate(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		var body struct {
			Name string `json:"name"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		name = strings.TrimSpace(body.Name)
	}
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Empty name"})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	_, _ = a.categories.UpdateOne(ctx, bson.M{"_id": name}, bson.M{"$setOnInsert": bson.M{"name": name}}, options.Update().SetUpsert(true))
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": name, "name": name})
}

func (a *App) ensureTagCategoryDocs(ctx context.Context, tags []string, categories []Category) {
	for _, t := range tags {
		if strings.TrimSpace(t) == "" {
			continue
		}
		_, _ = a.tags.UpdateOne(ctx, bson.M{"_id": t}, bson.M{"$setOnInsert": bson.M{"name": t}}, options.Update().SetUpsert(true))
	}
	for _, c := range categories {
		if strings.TrimSpace(c.Name) == "" {
			continue
		}
		_, _ = a.categories.UpdateOne(ctx, bson.M{"_id": c.Name}, bson.M{"$setOnInsert": bson.M{"name": c.Name}}, options.Update().SetUpsert(true))
	}
}

func (a *App) handleUpload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Invalid request"})
		return
	}

	postID := strings.TrimSpace(r.FormValue("post_id"))
	if postID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Не указан post_id"})
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "No file uploaded"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	name := fmt.Sprintf("img_%d_%s%s", time.Now().UnixNano(), randShort(), ext)
	dir := filepath.Join(a.cfg.UploadsDir, postID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "Cannot create dir"})
		return
	}
	dstPath := filepath.Join(dir, name)

	out, err := os.Create(dstPath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "Cannot save file"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "Cannot save file"})
		return
	}

	url := fmt.Sprintf("/uploads/%s/%s", postID, name)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "url": url})
}

func randomToken(size int) (string, error) {
	b := make([]byte, size)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func randShort() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// Optional helper for multipart size limits
func readMultipartFile(fh *multipart.FileHeader) ([]byte, error) {
	file, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()
	return io.ReadAll(file)
}
