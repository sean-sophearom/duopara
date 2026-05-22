/**
 * Centralized LLM prompts — all system instructions and user message templates.
 */

import { DIFFICULTY_GUIDES, STYLE_GUIDES, type Difficulty, type ContentStyle } from '../constants.js';

// ============================================
// System instructions (used in Agent config)
// ============================================

export function textGenerationInstructions(language: string, difficulty: string): string {
  const guide = DIFFICULTY_GUIDES[difficulty as Difficulty] ?? DIFFICULTY_GUIDES.intermediate;
  return `You are a language learning content generator specializing in ${language}. 
Your task is to generate engaging, contextually appropriate reading material.

Difficulty level: ${difficulty}
${guide}

IMPORTANT RULES:
1. Generate content ONLY in ${language}
2. Make the content engaging and contextually rich
3. The content should feel natural, not like a textbook
4. Return your response as JSON with "title" and "content" fields

Example response format:
{
  "title": "Title in ${language}",
  "content": "The story/article content in ${language}..."
}`;
}

export function wordTranslationInstructions(sourceLanguage: string, targetLanguage: string): string {
  return `You are a language translation assistant. 
Always respond with valid JSON. Be concise but accurate.
You translate words from ${sourceLanguage} to ${targetLanguage}.`;
}

export function sentenceTranslationInstructions(sourceLanguage: string, targetLanguage: string): string {
  return `You are a language learning assistant specializing in explaining ${sourceLanguage} grammar to ${targetLanguage} speakers. 
Always respond with valid JSON. Be educational and clear.
Provide translations with grammatical explanations when helpful.`;
}

export function grammarAnalysisInstructions(language: string): string {
  return `You are a linguistics expert specializing in ${language}. 
Provide accurate grammatical analysis. Always respond with valid JSON.
Analyze words for: part of speech, base form, gender (if applicable), 
conjugation details, number, and other relevant grammatical information.`;
}

export function fullAnalysisInstructions(sourceLanguage: string, targetLanguage: string): string {
  return `You are a language learning assistant. 
Provide translation and grammatical analysis for ${sourceLanguage} learners who speak ${targetLanguage}. 
Always respond with valid JSON.

For each word, provide:
- translation: ${targetLanguage} translation
- alternativeTranslations: other possible meanings
- partOfSpeech: grammatical category
- baseForm: infinitive/singular form
- gender: if applicable
- conjugation: tense, person, mood for verbs
- contextualNote: usage explanation`;
}

export function parallelTranslationInstructions(sourceLanguage: string, targetLanguage: string): string {
  return `You are a language learning assistant specializing in ${sourceLanguage} to ${targetLanguage} translation.
You will receive a numbered list of sentences. For each sentence return:
- translation: a natural, fluent ${targetLanguage} translation
- literalTranslation: an almost word-for-word translation keeping the source word order as closely as possible, helping learners see exactly how each word maps

Always respond with valid JSON. Return one entry per sentence in the same order.`;
}

export function enhancedTranslationInstructions(sourceLanguage: string, targetLanguage: string): string {
  return `You are a linguistic alignment specialist for ${sourceLanguage} to ${targetLanguage} translation.
Your task is to break each sentence into word/phrase alignment pairs so language learners can see exactly which source words/phrases correspond to which target words/phrases.

Rules:
- Every source word must appear in exactly one pair
- Pairs must be in source word order
- Group multi-word expressions when they map to a single concept (e.g. Vietnamese "xin chào" → "hello")
- Include grammatical particles/markers even if they have no direct translation — map them to their function (e.g. "は" → "[topic]") or bundle them with the adjacent word
- Keep pairs short — prefer 1-3 words per side
- Each pair is an object: {"s": "source phrase", "t": "target phrase"}

Always respond with valid JSON.`;
}

export function enhancedTranslationPrompt(
  language: string, targetLanguage: string, numberedList: string
): string {
  return `Break each of the following ${language} sentences into word/phrase alignment pairs with their ${targetLanguage} translations.
Return an array of objects — one per sentence, in the same order. Each object has a "pairs" array of {"s": source, "t": target} objects.

Sentences:
${numberedList}`;
}

export function textAdaptationInstructions(language: string): string {
  return `You are a language learning content specialist for ${language}.
Your task is to clean and adapt raw text content (extracted from uploaded documents) into clear, natural reading material.

RULES:
1. Keep the content in ${language} — do NOT translate it
2. Remove formatting artifacts: page numbers, headers, footers, broken PDF column text
3. Rejoin sentences that were split by line breaks
4. Keep the original meaning and vocabulary intact — do not simplify or paraphrase
5. Return your response as JSON with "title" and "content" fields`;
}

export function textAdaptationPrompt(rawContent: string): string {
  return `Clean and adapt the following extracted text into natural reading material. Remove document artifacts (page numbers, headers, footers, broken lines from PDF columns). Keep the original language and meaning intact.\n\nRaw content:\n${rawContent}`;
}

export function gameDataInstructions(sourceLanguage: string, targetLanguage: string): string {
  return `You are a language learning game content generator.
Your task is to create practice game data for vocabulary words.

The source language is ${sourceLanguage} and the target language is ${targetLanguage}.
Target language speakers are learning ${sourceLanguage}.

For each word, generate:
1. 5 plausible but INCORRECT definitions (distractors)
2. A very very short definition in ${targetLanguage} (should be similar in length to the distractors)
3. 5 plausible but INCORRECT translations (distractors - similar words or common confusions)
4. 3 example sentences showing the word in context, with the word blanked out
5. One false translation that sounds plausible but is wrong (for true/false game)

IMPORTANT:
- Definitions should be in ${targetLanguage} (the target/native language)
- Distractors should be believable enough to challenge learners
- Example sentences should be natural, not too complex
- The false translation should be semantically related but clearly wrong

Always respond with valid JSON.`;
}

// ============================================
// User message prompts (sent as generate() input)
// ============================================

export function gameDataPrompt(
  word: string, sourceLanguage: string, targetLanguage: string, translationHint: string
): string {
  return `Generate practice game data for the following word:

Word: "${word}" (${sourceLanguage})
Hint translation: "${translationHint || 'unknown'}" (${targetLanguage})

Generate:
1. The correct translation in ${targetLanguage}
2. 5 plausible but incorrect definitions (distractors)
3. A very very short definition in ${targetLanguage} (should be similar in length to the distractors)
4. 5 plausible but incorrect translations (distractors)
5. 3 example sentences with the word blanked out (in ${sourceLanguage})
6. One false translation for true/false game

Return as JSON.`;
}

export function wordTranslationPrompt(
  word: string, sourceLanguage: string, targetLanguage: string, context?: string
): string {
  if (context) {
    return `Translate the word "${word}" from ${sourceLanguage} to ${targetLanguage}.
The word appears in this context: "${context}"
Provide the translation, alternative translations, and explain why this translation fits the context.`;
  }
  return `Translate the word "${word}" from ${sourceLanguage} to ${targetLanguage}.
Provide the primary translation and alternative meanings.`;
}

export function sentenceTranslationPrompt(
  sentence: string, sourceLanguage: string, targetLanguage: string, includeGrammarHints: boolean
): string {
  if (includeGrammarHints) {
    return `Translate this ${sourceLanguage} sentence to ${targetLanguage}:
"${sentence}"

Provide the translation, grammar notes explaining key grammar points (conjugations, tenses, structures), and a literal word-by-word translation.`;
  }
  return `Translate this ${sourceLanguage} sentence to ${targetLanguage}:
"${sentence}"`;
}

export function grammarAnalysisPrompt(word: string, language: string, context?: string): string {
  return `Analyze this ${language} word: "${word}"
${context ? `Context: "${context}"` : ''}

Provide grammatical analysis: part of speech, base form (infinitive for verbs, singular for nouns), gender if applicable, conjugation details for verbs, number (singular/plural), and any additional grammatical info.`;
}

export function fullAnalysisPrompt(
  word: string, sourceLanguage: string, targetLanguage: string, context?: string
): string {
  return `For the ${sourceLanguage} word "${word}"${context ? ` in context: "${context}"` : ''}:

Provide ${targetLanguage} translation, alternative meanings, grammatical analysis (part of speech, base form, gender, conjugation for verbs), and a note on contextual usage.`;
}

export function parallelTranslationPrompt(
  language: string, targetLanguage: string, numberedList: string
): string {
  return `Translate each of the following ${language} sentences into ${targetLanguage}.
Return an array of objects — one per sentence, in the same order.

Sentences:
${numberedList}`;
}

export function textGenerationPrompt(params: {
  topic: string;
  language: string;
  difficulty: string;
  knownWordsRatio: number;
  wordCount: number;
  style: ContentStyle;
  knownWords: string[];
}): string {
  const sliceCount = Math.max(50, params.wordCount - 20);
  const knownWordsHint = params.knownWords.length > 0
    ? `\n\nThe learner knows these words (use approximately ${params.knownWordsRatio}% of vocabulary from this list): ${params.knownWords.slice(0, sliceCount).join(', ')}${params.knownWords.length > sliceCount ? '... and more' : ''}`
    : '\n\nThe learner is a beginner with limited vocabulary. Keep words simple and common.';

  return `Generate ${params.style} content in ${params.language} about: "${params.topic}"

Style: ${STYLE_GUIDES[params.style]}
Target length: approximately ${params.wordCount} words
Vocabulary ratio: ${params.knownWordsRatio}% familiar words, ${100 - params.knownWordsRatio}% new/challenging words
${knownWordsHint}

Remember:
- New vocabulary should be understandable from context
- Include some repetition of new words for reinforcement
- Make it interesting and motivating to read`;
}

export function textRegenerationPrompt(params: {
  originalContent: string;
  topic: string;
  action: 'simplify' | 'harder';
  language: string;
  knownWords: string[];
  newDifficulty: string;
  wordCount: number;
}): string {
  const sliceCount = Math.max(50, params.wordCount - 20);
  const actionGuide = params.action === 'simplify'
    ? `SIMPLIFY this text:
- Use simpler vocabulary
- Shorter sentences
- Simpler grammar structures
- Keep the same general topic and story
- Make it more accessible for learners`
    : `MAKE THIS TEXT MORE CHALLENGING:
- Use more sophisticated vocabulary
- More complex sentence structures
- Advanced grammar (subjunctive, conditionals)
- Add idiomatic expressions
- Maintain the story/topic but elevate the language`;

  return `${actionGuide}

Original text (${params.language}):
"""
${params.originalContent}
"""

Topic: ${params.topic}
New difficulty level: ${params.newDifficulty}

The learner knows these words: ${params.knownWords.slice(0, sliceCount).join(', ')}

Generate a ${params.action === 'simplify' ? 'simpler' : 'more challenging'} version while keeping it engaging.`;
}
