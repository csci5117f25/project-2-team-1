<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useCurrentUser, useFirebaseAuth } from 'vuefire'

const user = useCurrentUser()
const auth = useFirebaseAuth()
const provider = new GoogleAuthProvider();

async function login() {
    try {
        const result = await signInWithPopup(auth, provider)
    } catch {
        alert("oh no");
    }
  }
</script>

<template>
  <div><button @click="login()" v-if="!user">log in</button></div>
</template>

<style scoped lang="scss"></style>
