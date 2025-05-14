<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let isSignup = $derived($page.url.searchParams.get('signup') === 'true');
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="card p-8 w-full max-w-md space-y-6">
    <header class="text-center">
      <h2 class="h2 mb-2">{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
      <p class="text-surface-600-300-token">
        {isSignup ? 'Sign up to start your family tree' : 'Please sign in to continue'}
      </p>
    </header>

    <form 
      method="POST" 
      action={isSignup ? '?/signup' : '?/login'} 
      class="space-y-4" 
      use:enhance
    >
      <label class="label">
        <span>Email</span>
        <input 
          name="email" 
          type="email" 
          class="input"
          placeholder="Enter your email"
          required
        />
      </label>

      <label class="label">
        <span>Password</span>
        <input 
          name="password" 
          type="password" 
          class="input"
          placeholder="Enter your password"
          required
        />
      </label>

      {#if !isSignup}
        <div class="flex justify-between items-center">
          <label class="flex items-center space-x-2">
            <input type="checkbox" class="checkbox" />
            <span class="text-sm">Remember me</span>
          </label>
          <a href="/auth/reset-password" class="anchor text-sm">Forgot password?</a>
        </div>
      {/if}

      <div class="space-y-4">
        <button type="submit" class="btn variant-filled-primary w-full">
          {isSignup ? 'Create Account' : 'Sign In'}
        </button>
        
        <div class="text-center">
          <span class="text-surface-600-300-token">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <a 
            href={isSignup ? '/auth' : '/auth?signup=true'} 
            class="anchor ml-1"
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </a>
        </div>
      </div>
    </form>
  </div>
</div>