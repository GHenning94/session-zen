import { Check, X } from "lucide-react"

interface PasswordRequirementsProps {
  password: string
}

export const PasswordRequirements = ({ password }: PasswordRequirementsProps) => {
  const requirements = [
    {
      text: "Pelo menos 8 caracteres",
      test: (pwd: string) => pwd.length >= 8
    },
    {
      text: "Uma letra maiúscula",
      test: (pwd: string) => /[A-Z]/.test(pwd)
    },
    {
      text: "Uma letra minúscula", 
      test: (pwd: string) => /[a-z]/.test(pwd)
    },
    {
      text: "Um número",
      test: (pwd: string) => /\d/.test(pwd)
    },
    {
      text: "Um caractere especial",
      test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    }
  ]

  return (
    <div className="space-y-2 mt-2">
      <p className="text-sm text-muted-foreground">Requisitos da senha:</p>
      <div className="space-y-1">
        {requirements.map((req, index) => {
          const isValid = req.test(password)
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              {isValid ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={isValid ? "text-green-500" : "text-muted-foreground"}>
                {req.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}