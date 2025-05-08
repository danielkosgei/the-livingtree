// import { login, signup } from './actions'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/20 p-6 md:p-10">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.15] dark:opacity-[0.02]">
        <div className="aspect-square w-full max-w-3xl rotate-45 scale-[2] rounded-full bg-gradient-to-br from-primary/20 via-muted to-background blur-3xl" />
      </div>
      
      {/* Content */}
      <div className="relative h-full w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  )
}