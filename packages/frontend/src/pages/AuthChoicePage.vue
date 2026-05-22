<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { BookOpen, LogIn, UserPlus } from 'lucide-vue-next';
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden bg-gradient-to-b from-primary-50 to-white">
    <div class="absolute -top-28 -left-20 h-72 w-72 rounded-full bg-primary-200/50 blur-3xl" />
    <div class="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-primary-100/80 blur-3xl" />

    <main class="relative flex min-h-dvh w-full items-center">
      <div class="flex min-h-dvh w-full items-center border-y border-primary-100 bg-white/95 px-6 py-8 shadow-xl sm:px-10 sm:py-10 lg:px-16">
        <div class="mx-auto w-full max-w-6xl">
          <div class="mb-10 flex flex-col items-start text-left">
            <div class="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-600">
              <BookOpen class="h-9 w-9 text-white" />
            </div>
            <p class="mt-4 text-4xl font-extrabold tracking-wide text-slate-900">Kontexi</p>
          </div>

          <div class="grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div>
            <h1 class="mt-5 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Welcome to Kontexi
            </h1>
            <p class="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Learn language by reading, one step at a time.
            </p>
          </div>

          <div class="w-full space-y-3 lg:w-72">
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
    </main>
  </div>
</template>
