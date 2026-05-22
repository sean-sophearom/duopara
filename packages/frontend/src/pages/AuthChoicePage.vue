<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { BookOpen, Headphones, Languages, Library, LogIn, Sparkles, UserPlus } from 'lucide-vue-next';
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden bg-gradient-to-b from-primary-50 to-white lg:bg-[linear-gradient(120deg,#f8fafc_0%,#eef6fb_46%,#ffffff_46%,#ffffff_100%)]">
    <div class="absolute -top-28 -left-20 h-72 w-72 rounded-full bg-primary-200/50 blur-3xl lg:hidden" />
    <div class="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-primary-100/80 blur-3xl lg:hidden" />
    <div class="absolute inset-y-0 left-0 hidden w-[54%] border-r border-slate-200/70 bg-[radial-gradient(circle_at_1px_1px,#cbd5e1_1px,transparent_0)] bg-[length:28px_28px] opacity-35 lg:block" />

    <main class="relative flex min-h-dvh w-full items-center">
      <div class="flex min-h-dvh w-full items-center border-y border-primary-100 bg-white/95 px-6 py-8 shadow-xl sm:px-10 sm:py-10 lg:border-0 lg:bg-transparent lg:px-16 lg:py-6 lg:shadow-none xl:px-20">
        <div class="mx-auto w-full max-w-6xl lg:max-w-7xl">
          <div class="mb-10 flex flex-col items-start text-left lg:hidden">
            <div class="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-600">
              <BookOpen class="h-9 w-9 text-white" />
            </div>
            <p class="mt-4 text-4xl font-extrabold tracking-wide text-slate-900">Kontexi</p>
          </div>

          <div class="grid items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.78fr)] lg:gap-14 xl:gap-20">
            <div>
              <div class="mb-6 hidden items-center gap-3 lg:flex">
                <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg shadow-slate-900/10">
                  <BookOpen class="h-5 w-5" />
                </div>
                <div>
                  <p class="text-xl font-extrabold tracking-wide text-slate-950">Kontexi</p>
                  <p class="text-sm font-medium text-slate-500">Read with context</p>
                </div>
              </div>
              <p class="mb-5 hidden w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm lg:flex lg:items-center lg:gap-2">
                <Sparkles class="h-4 w-4 text-amber-500" />
                Context-first reading practice
              </p>
              <h1 class="mt-5 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:hidden">
                Welcome to Kontexi
              </h1>
              <h1 class="mt-5 hidden max-w-3xl text-5xl font-extrabold leading-[1.03] text-slate-950 lg:block xl:text-6xl">
                Learn words in the context they came from.
              </h1>
              <p class="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg lg:hidden">
                Learn language by reading, one step at a time.
              </p>
              <p class="mt-5 hidden max-w-2xl text-lg leading-7 text-slate-600 lg:block xl:text-xl xl:leading-8">
                Kontexi keeps every new word connected to the sentence, translation, and story around it, so review starts with meaning instead of memorized fragments.
              </p>

              <div class="mt-5 hidden grid-cols-3 gap-3 lg:grid">
                <div class="border-l-2 border-primary-500 pl-4">
                  <p class="text-2xl font-extrabold text-slate-950">Tap</p>
                  <p class="mt-1 text-sm leading-5 text-slate-500">open meaning inside the sentence</p>
                </div>
                <div class="border-l-2 border-emerald-500 pl-4">
                  <p class="text-2xl font-extrabold text-slate-950">Connect</p>
                  <p class="mt-1 text-sm leading-5 text-slate-500">compare translation and usage</p>
                </div>
                <div class="border-l-2 border-amber-500 pl-4">
                  <p class="text-2xl font-extrabold text-slate-950">Review</p>
                  <p class="mt-1 text-sm leading-5 text-slate-500">practice with the original context</p>
                </div>
              </div>

              <div class="mt-5 hidden max-w-xl grid-cols-2 gap-3 lg:grid">
                <RouterLink
                  to="/register/setup/target"
                  class="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3.5 text-base font-extrabold text-white shadow-sm shadow-primary-700/20 transition hover:bg-primary-700"
                >
                  <UserPlus class="h-5 w-5" />
                  CREATE ACCOUNT
                </RouterLink>

                <RouterLink
                  to="/login/form"
                  class="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-base font-bold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
                >
                  <LogIn class="h-5 w-5" />
                  SIGN IN
                </RouterLink>
              </div>
            </div>

            <div class="w-full space-y-3 lg:w-auto lg:space-y-5">
              <div class="hidden overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/80 lg:block">
                <div class="border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="h-3 w-3 rounded-full bg-rose-400" />
                      <span class="h-3 w-3 rounded-full bg-amber-400" />
                      <span class="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Reader</p>
                  </div>
                </div>
                <div class="space-y-4 p-5">
                  <div class="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
                    <div class="mb-3 flex items-center justify-between">
                      <p class="text-sm font-bold text-primary-200">Context reader</p>
                      <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">A2</span>
                    </div>
                    <p class="text-lg font-bold leading-7">La ciudad despierta lentamente mientras Ana busca su primera cafeteria.</p>
                    <p class="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-slate-300">
                      The city wakes slowly while Ana looks for her first cafe.
                    </p>
                    <div class="mt-4 rounded-2xl bg-white p-3.5 text-slate-900">
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-primary-700">despierta</p>
                          <p class="mt-1 text-lg font-extrabold">wakes up</p>
                        </div>
                        <span class="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">verb</span>
                      </div>
                      <p class="mt-3 text-sm leading-6 text-slate-500">Learn it from the sentence where it appeared, then save it with that context.</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                    <div class="rounded-2xl border border-primary-100 bg-primary-50 p-3.5">
                      <Languages class="h-5 w-5 text-primary-700" />
                      <p class="mt-3 text-sm font-bold text-slate-900">Sentence</p>
                    </div>
                    <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5">
                      <Headphones class="h-5 w-5 text-emerald-700" />
                      <p class="mt-3 text-sm font-bold text-slate-900">Audio</p>
                    </div>
                    <div class="rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
                      <Library class="h-5 w-5 text-amber-700" />
                      <p class="mt-3 text-sm font-bold text-slate-900">Context</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3 lg:hidden">
                <RouterLink
                  to="/register/setup/target"
                  class="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-primary-700"
                >
                  <UserPlus class="h-5 w-5" />
                  CREATE ACCOUNT
                </RouterLink>

                <RouterLink
                  to="/login/form"
                  class="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary-200 bg-white px-5 py-4 text-base font-bold text-primary-700 transition hover:border-primary-300"
                >
                  <LogIn class="h-5 w-5" />
                  SIGN IN
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
