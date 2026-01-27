FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/mercilium-api ./cmd/server

FROM alpine:3.20
WORKDIR /app
RUN adduser -D -g '' app
USER app
COPY --from=build /bin/mercilium-api /usr/local/bin/mercilium-api
ENV BIND_ADDR=:8080
EXPOSE 8080
CMD ["mercilium-api"]
