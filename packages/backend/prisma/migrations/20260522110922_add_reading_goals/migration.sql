-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL DEFAULT 'Spanish',
    "nativeLanguage" TEXT NOT NULL DEFAULT 'English',
    "knownWordsRatio" INTEGER NOT NULL DEFAULT 80,
    "defaultDifficulty" TEXT NOT NULL DEFAULT 'intermediate',
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VocabularyWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "translation" TEXT,
    "partOfSpeech" TEXT,
    "baseForm" TEXT,
    "status" TEXT NOT NULL DEFAULT 'learning',
    "timesEncountered" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" DATETIME,
    "practiceStreak" INTEGER NOT NULL DEFAULT 0,
    "nextPracticeAt" DATETIME,
    "difficultyScore" REAL NOT NULL DEFAULT 2.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "masteredAt" DATETIME,
    CONSTRAINT "VocabularyWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "knownWordsRatio" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "knownWordsUsed" TEXT NOT NULL,
    "newWordsIntroduced" TEXT NOT NULL,
    "parallelTranslation" TEXT,
    "enhancedTranslation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedText_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "textId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "wordsLookedUp" TEXT NOT NULL DEFAULT '[]',
    "wordsMarkedLearned" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "ReadingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReadingSession_textId_fkey" FOREIGN KEY ("textId") REFERENCES "GeneratedText" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "textsRead" INTEGER NOT NULL DEFAULT 0,
    "wordsLearned" INTEGER NOT NULL DEFAULT 0,
    "minutesActive" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "GameWordData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "distractorDefinitions" TEXT NOT NULL,
    "distractorTranslations" TEXT NOT NULL,
    "exampleSentences" TEXT NOT NULL,
    "falseTranslation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "totalWords" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "config" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "vocabularyWordId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER,
    "questionData" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "targetWords" INTEGER NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionData" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_language_status_idx" ON "VocabularyWord"("userId", "language", "status");

-- CreateIndex
CREATE INDEX "VocabularyWord_userId_nextPracticeAt_idx" ON "VocabularyWord"("userId", "nextPracticeAt");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyWord_userId_word_language_key" ON "VocabularyWord"("userId", "word", "language");

-- CreateIndex
CREATE INDEX "GeneratedText_userId_createdAt_idx" ON "GeneratedText"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReadingSession_userId_startedAt_idx" ON "ReadingSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TranslationCache_endpoint_cacheKey_idx" ON "TranslationCache"("endpoint", "cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationCache_endpoint_cacheKey_key" ON "TranslationCache"("endpoint", "cacheKey");

-- CreateIndex
CREATE INDEX "DailyActivity_userId_date_idx" ON "DailyActivity"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_userId_date_key" ON "DailyActivity"("userId", "date");

-- CreateIndex
CREATE INDEX "GameWordData_word_sourceLanguage_targetLanguage_idx" ON "GameWordData"("word", "sourceLanguage", "targetLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "GameWordData_word_sourceLanguage_targetLanguage_key" ON "GameWordData"("word", "sourceLanguage", "targetLanguage");

-- CreateIndex
CREATE INDEX "PracticeSession_userId_startedAt_idx" ON "PracticeSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "PracticeSession_userId_gameType_idx" ON "PracticeSession"("userId", "gameType");

-- CreateIndex
CREATE INDEX "PracticeAttempt_sessionId_idx" ON "PracticeAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_vocabularyWordId_idx" ON "PracticeAttempt"("vocabularyWordId");

-- CreateIndex
CREATE INDEX "ReadingGoal_userId_status_idx" ON "ReadingGoal"("userId", "status");

-- CreateIndex
CREATE INDEX "ReadingGoal_userId_createdAt_idx" ON "ReadingGoal"("userId", "createdAt");
