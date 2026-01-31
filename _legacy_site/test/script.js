// Роли
const ROLES = {
    king: "Король",
    warrior: "Воин",
    mage: "Маг",
    poet: "Поэт",
    jester: "Шут",
    advisor: "Советник"
};

// Картинки ролей — подставь свои файлы
const ROLE_IMAGES = {
    king: "img/korol.webp",
    warrior: "img/voin.webp",
    mage: "img/mag.webp",
    poet: "img/poet.webp",
    jester: "img/shut.webp",
    advisor: "img/sovetnik.webp"
};

// Описание итоговой роли
const ROLE_DESCRIPTIONS = {
    king:
        "В твоих ответах много про удержание центра: тебе естественно брать на себя решения, когда остальные колеблются. " +
        "Ты смотришь на общий рисунок, а не на отдельные штрихи.",
    warrior:
        "Ты выбираешь движение вместо ожидания. Там, где другим нужно долго разгоняться, ты скорее делаешь шаг вперёд и проверяешь границы на прочность.",
    mage:
        "Ты тянешься к причинам, а не к симптомам. В твоих ответах ощущается интерес к системам, закономерностям и тихим механизмам, которые двигают всё вокруг.",
    poet:
        "Тебе важно, как всё ощущается изнутри. Ты замечаешь оттенки, паузы и настроение событий не хуже, чем сами события.",
    jester:
        "Ты умеешь переворачивать картинку и смотреть на неё под неожиданным углом. Через игру и парадокс ты проверяешь, насколько всё вокруг живое.",
    advisor:
        "Ты видишь последствия чуть дальше, чем большинство. Внутри твоих ответов — привычка сверять шаги с логикой и собирать мозаики из деталей."
};

// Вопросы. В формулировках нет прямых указаний на мечи, магию, шутов и т.п.
// Каждая опция даёт очки сразу нескольким ролям, часто неочевидным.
const questions = [
    {
        text: "Дорога ведёт в новый город. Ночь впереди свободна, спутники спят. Чем ты, скорее всего, займёшься?",
        answers: [
            {
                text: "Переберу в голове возможные варианты, чем может обернуться завтрашний день, и прикину несколько ходов вперёд.",
                weights: { advisor: 2, king: 1, mage: 1 }
            },
            {
                text: "Проверю, что готов к любому неожиданному повороту, и телом, и головой. Остальное разберём на месте.",
                weights: { warrior: 2, king: 1 }
            },
            {
                text: "Буду ловить атмосферу: звук колес, шорох ветра, свои мысли — пригодятся позже, когда это станет историей.",
                weights: { poet: 2, jester: 1 }
            },
            {
                text: "Попробую заметить мелочи, которые другие пропустили: странные огни, чужие маршруты, повторяющиеся знаки.",
                weights: { mage: 2, advisor: 1 }
            },
            {
                text: "Придумаю, как завтра снять напряжение у остальных, если дорога окажется сложнее, чем кажется.",
                weights: { jester: 2, warrior: 1 }
            }
        ]
    },
    {
        text: "В странноприимном доме хозяин просит: «Подскажите, как нам вести дела дальше, времена меняются». Твоя внутренняя реакция ближе всего к…",
        answers: [
            {
                text: "Сначала посмотреть, как всё устроено сейчас, и только потом говорить, что трогать, а чего лучше не менять.",
                weights: { advisor: 2, mage: 1 }
            },
            {
                text: "Собрать вокруг него людей, которые уже готовы идти вперёд, и дать им опору в лице хозяина.",
                weights: { king: 2, warrior: 1 }
            },
            {
                text: "Предложить взглянуть на дом глазами гостей, чтобы понять, что они будут помнить годы спустя.",
                weights: { poet: 2, king: 1 }
            },
            {
                text: "Немного разрядить обстановку, показать через лёгкий жест, где слабые места, не обижая никого всерьёз.",
                weights: { jester: 2, advisor: 1 }
            },
            {
                text: "Найти пару нетривиальных ходов, которые на первый взгляд кажутся странными, но сильно меняют расстановку сил.",
                weights: { mage: 2, jester: 1 }
            }
        ]
    },
    {
        text: "На площади собираются люди: кто-то тревожится, кто-то спорит, кто-то просто наблюдает. Где ты оказываешься в этой картине?",
        answers: [
            {
                text: "Чуть в стороне, чтобы видеть всю сцену целиком и понимать, куда всё качнётся.",
                weights: { advisor: 2, mage: 1 }
            },
            {
                text: "Ближе к центру, там, где нужно удерживать линию и не дать толпе разойтись слишком далеко.",
                weights: { king: 2, warrior: 1 }
            },
            {
                text: "Там, где можно перевести спор в игру, дать людям выдохнуть и посмотреть друг на друга спокойно.",
                weights: { jester: 2, king: 1 }
            },
            {
                text: "Там, где ярче всего эмоции. Хочется увидеть их вблизи, чтобы понять, что на самом деле людей цепляет.",
                weights: { poet: 2, warrior: 1 }
            },
            {
                text: "Там, где можно внимательно прислушаться к фразам и оговоркам — именно в них часто прячется главное.",
                weights: { mage: 2, poet: 1 }
            }
        ]
    },
    {
        text: "Тебе дают чистый лист и говорят: «Опиши, каким ты хочешь видеть свой ближайший год». Что оказывается на листе прежде всего?",
        answers: [
            {
                text: "Конкретные шаги и рубежи: где я хочу быть, какие решения должны быть приняты.",
                weights: { king: 2, advisor: 1 }
            },
            {
                text: "Ситуации, в которых нужно будет проявить выдержку, риск и способность держать удар.",
                weights: { warrior: 2, king: 1 }
            },
            {
                text: "Темы и вопросы, в которые хочется нырнуть глубже, чем сейчас позволяет повседневность.",
                weights: { mage: 2, poet: 1 }
            },
            {
                text: "Образы, сцены и состояния — не столько события, сколько то, как они будут ощущаться.",
                weights: { poet: 2, jester: 1 }
            },
            {
                text: "Люди и связи: кому я могу быть полезен, кого поддержать, где помочь всем чуть легче дышать.",
                weights: { jester: 2, advisor: 1 }
            }
        ]
    },
    {
        text: "На перекрёстке дороги расходятся: одна предсказуемая, другая туманная, третья зависит от чужого выбора. К чему ты склоняешься?",
        answers: [
            {
                text: "К туманной: если всё ясно заранее, в ней мало смысла — интереснее искать путь по ходу.",
                weights: { mage: 2, warrior: 1 }
            },
            {
                text: "К предсказуемой: там, где я понимаю правила, я могу влиять на исход гораздо сильнее.",
                weights: { king: 2, advisor: 1 }
            },
            {
                text: "К той, что зависит от чужого выбора: интересно, как сменится маршрут, если дать кому-то ведущую роль.",
                weights: { advisor: 2, jester: 1 }
            },
            {
                text: "К той, где можно будет потом рассказать о пути не хуже, чем о пункте назначения.",
                weights: { poet: 2, mage: 1 }
            },
            {
                text: "К той, где придётся испытать себя на прочность — даже если карты против.",
                weights: { warrior: 2, king: 1 }
            }
        ]
    },
    {
        text: "В замке возникает спор о сложном решении. Тебя просят высказаться последним. Как ты используешь это положение?",
        answers: [
            {
                text: "Собираю всё, что уже сказали, и складываю в более стройную линию, показывая последствия.",
                weights: { advisor: 2, king: 1 }
            },
            {
                text: "Отмечаю, где уже прозвучала сила, а где сомнение, и поддерживаю сторону, которая готова действовать.",
                weights: { warrior: 2, king: 1 }
            },
            {
                text: "Переосмысливаю вопрос так, чтобы он стал глубже, чем казался вначале.",
                weights: { mage: 2, poet: 1 }
            },
            {
                text: "Делаю акцент на том, что за сухими формулировками стоят живые люди и их переживания.",
                weights: { poet: 2, advisor: 1 }
            },
            {
                text: "Вношу нотку непредсказуемости, которая позволяет всем выйти из тупика и взглянуть на решение иначе.",
                weights: { jester: 2, mage: 1 }
            }
        ]
    },
    {
        text: "Тебе достаётся задача без чётких рамок и сроков. Как ты превращаешь её во что-то реальное?",
        answers: [
            {
                text: "Разбиваю на несколько ясных шагов и сразу назначаю, за что отвечаю лично.",
                weights: { king: 2, advisor: 1 }
            },
            {
                text: "Выясняю, где возможен наибольший риск, и начинаю с этого края.",
                weights: { warrior: 2, mage: 1 }
            },
            {
                text: "Сначала собираю информацию: примеры, предыстории, странные детали.",
                weights: { mage: 2, advisor: 1 }
            },
            {
                text: "Придумываю образ, который удержит в фокусе смысл этой задачи для меня и других.",
                weights: { poet: 2, king: 1 }
            },
            {
                text: "Проверяю, где можно оставить себе пространство для импровизации — так дело идёт живее.",
                weights: { jester: 2, warrior: 1 }
            }
        ]
    },
    {
        text: "Вечером, когда день уже позади, на чём чаще всего задерживаются твои мысли?",
        answers: [
            {
                text: "На том, какие решения сегодня могли повернуть всё иначе.",
                weights: { advisor: 2, king: 1 }
            },
            {
                text: "На моментах, где пришлось действовать на пределе — приятно чувствовать эту усталость.",
                weights: { warrior: 2, jester: 1 }
            },
            {
                text: "На странных связках событий, которые выстроились в неожиданный узор.",
                weights: { mage: 2, poet: 1 }
            },
            {
                text: "На фразах, взглядах и маленьких эпизодах, которые почему-то зацепили сильнее остальных.",
                weights: { poet: 2, advisor: 1 }
            },
            {
                text: "На том, кого сегодня удалось расслабить, рассмешить или просто вернуть в нормальное состояние.",
                weights: { jester: 2, king: 1 }
            }
        ]
    }
];

// ========================== ЛОГИКА ТЕСТА =============================

let currentQuestionIndex = 0;
let scores = {};
let totalScore = 0;
let selectedAnswerIndex = null;

const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const questionTextEl = document.getElementById("question-text");
const answersListEl = document.getElementById("answers-list");
const nextBtn = document.getElementById("next-btn");
const progressBarEl = document.getElementById("progress-bar");
const questionCounterEl = document.getElementById("question-counter");

const resultRoleEl = document.getElementById("result-role");
const resultDescriptionEl = document.getElementById("result-description");
const resultListEl = document.getElementById("result-list");
const resultImageEl = document.getElementById("result-image");
const restartBtn = document.getElementById("restart-btn");

function initScores() {
    scores = {};
    totalScore = 0;
    Object.keys(ROLES).forEach(roleKey => {
        scores[roleKey] = 0;
    });
}

// Перемешиваем массив на месте
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function renderQuestion() {
    const q = questions[currentQuestionIndex];
    questionTextEl.textContent = q.text;
    questionCounterEl.textContent = `Вопрос ${currentQuestionIndex + 1} из ${questions.length}`;

    const progress = (currentQuestionIndex / questions.length) * 100;
    progressBarEl.style.width = `${progress}%`;

    answersListEl.innerHTML = "";
    selectedAnswerIndex = null;
    nextBtn.disabled = true;

    const answersWithIndex = q.answers.map((answer, index) => ({ answer, index }));
    shuffleArray(answersWithIndex);

    answersWithIndex.forEach(({ answer, index }) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.textContent = answer.text;
        btn.dataset.answerIndex = String(index);

        btn.addEventListener("click", () => {
            document.querySelectorAll(".answer-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            selectedAnswerIndex = index;
            nextBtn.disabled = false;
        });

        li.appendChild(btn);
        answersListEl.appendChild(li);
    });
}

function applyAnswer() {
    if (selectedAnswerIndex === null) return;

    const q = questions[currentQuestionIndex];
    const selectedAnswer = q.answers[selectedAnswerIndex];

    for (const [role, amount] of Object.entries(selectedAnswer.weights)) {
        scores[role] += amount;
        totalScore += amount;
    }
}

function showResults() {
    quizScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    progressBarEl.style.width = "100%";

    const resultArray = Object.entries(scores).map(([roleKey, value]) => {
        const percent = totalScore > 0 ? Math.round((value / totalScore) * 100) : 0;
        return { roleKey, value, percent };
    });

    resultArray.sort((a, b) => b.percent - a.percent);

    const top = resultArray[0];

    resultRoleEl.textContent = ROLES[top.roleKey];
    resultDescriptionEl.textContent = ROLE_DESCRIPTIONS[top.roleKey] || "";

    const imgSrc = ROLE_IMAGES[top.roleKey];
    if (imgSrc) {
        resultImageEl.src = imgSrc;
    } else {
        resultImageEl.removeAttribute("src");
    }

    resultListEl.innerHTML = "";
    resultArray.forEach((item, idx) => {
        const li = document.createElement("li");
        li.className = "result-item";

        const nameSpan = document.createElement("span");
        nameSpan.textContent = ROLES[item.roleKey];
        if (idx === 0) {
            nameSpan.classList.add("result-item-main");
        }

        const percentSpan = document.createElement("span");
        percentSpan.textContent = `${item.percent} %`;

        li.appendChild(nameSpan);
        li.appendChild(percentSpan);
        resultListEl.appendChild(li);
    });
}

function restartQuiz() {
    currentQuestionIndex = 0;
    initScores();
    // Перемешиваем порядок вопросов при каждом новом прохождении
    shuffleArray(questions);
    quizScreen.classList.remove("hidden");
    resultScreen.classList.add("hidden");
    renderQuestion();
}

nextBtn.addEventListener("click", () => {
    applyAnswer();

    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        showResults();
    }
});

restartBtn.addEventListener("click", restartQuiz);

// Стартуем
initScores();
shuffleArray(questions);
renderQuestion();
