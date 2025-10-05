import { z } from 'zod';

/**
 * Validation schemas for forms across the application
 * Uses Zod for runtime type checking and validation
 */

// Brazilian phone validation (with or without formatting)
const phoneRegex = /^(\(\d{2}\)\s?)?\d{4,5}-?\d{4}$/;

// Brazilian CPF validation (with or without formatting)
const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

// Email validation schema
export const emailSchema = z.string()
  .trim()
  .email({ message: "Email inválido" })
  .max(255, { message: "Email deve ter no máximo 255 caracteres" });

// Phone validation schema
export const phoneSchema = z.string()
  .trim()
  .regex(phoneRegex, { message: "Telefone inválido. Use o formato (11) 98765-4321" })
  .min(10, { message: "Telefone deve ter pelo menos 10 dígitos" });

// CPF validation schema
export const cpfSchema = z.string()
  .trim()
  .regex(cpfRegex, { message: "CPF inválido. Use o formato 123.456.789-00" })
  .optional()
  .or(z.literal(''));

// Client registration schema
export const clientRegistrationSchema = z.object({
  nome: z.string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  
  email: emailSchema.optional().or(z.literal('')),
  
  telefone: phoneSchema,
  
  cpf: cpfSchema,
  
  data_nascimento: z.string().optional().or(z.literal('')),
  
  genero: z.enum(['masculino', 'feminino', 'outro', 'prefiro-nao-informar'])
    .optional()
    .or(z.literal('')),
  
  endereco: z.string()
    .trim()
    .max(500, { message: "Endereço deve ter no máximo 500 caracteres" })
    .optional()
    .or(z.literal('')),
  
  profissao: z.string()
    .trim()
    .max(100, { message: "Profissão deve ter no máximo 100 caracteres" })
    .optional()
    .or(z.literal('')),
  
  plano_saude: z.string()
    .trim()
    .max(100, { message: "Plano de saúde deve ter no máximo 100 caracteres" })
    .optional()
    .or(z.literal('')),
  
  medicamentos: z.array(z.string().trim().max(200))
    .max(50, { message: "Máximo de 50 medicamentos" })
    .optional(),
  
  tratamento: z.string()
    .trim()
    .max(1000, { message: "Tratamento deve ter no máximo 1000 caracteres" })
    .optional()
    .or(z.literal('')),
  
  pais: z.string()
    .trim()
    .max(100, { message: "País deve ter no máximo 100 caracteres" })
    .optional()
    .or(z.literal('')),
  
  eh_crianca_adolescente: z.boolean().optional(),
  
  emergencia_igual_pais: z.boolean().optional(),
  
  nome_pai: z.string().trim().max(100).optional().or(z.literal('')),
  telefone_pai: z.string().trim().max(20).optional().or(z.literal('')),
  nome_mae: z.string().trim().max(100).optional().or(z.literal('')),
  telefone_mae: z.string().trim().max(20).optional().or(z.literal('')),
  
  contato_emergencia_1_nome: z.string().trim().max(100).optional().or(z.literal('')),
  contato_emergencia_1_telefone: z.string().trim().max(20).optional().or(z.literal('')),
  contato_emergencia_2_nome: z.string().trim().max(100).optional().or(z.literal('')),
  contato_emergencia_2_telefone: z.string().trim().max(20).optional().or(z.literal('')),
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(1, { message: "Senha é obrigatória" }),
});

// Signup schema with password requirements
export const signupSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  
  profession: z.string()
    .min(1, { message: "Profissão é obrigatória" }),
  
  email: emailSchema,
  
  password: z.string()
    .min(8, { message: "Senha deve ter pelo menos 8 caracteres" })
    .regex(/[A-Z]/, { message: "Senha deve conter pelo menos uma letra maiúscula" })
    .regex(/[a-z]/, { message: "Senha deve conter pelo menos uma letra minúscula" })
    .regex(/\d/, { message: "Senha deve conter pelo menos um número" })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: "Senha deve conter pelo menos um caractere especial" }),
  
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Session/Booking schema
export const sessionSchema = z.object({
  data: z.string()
    .min(1, { message: "Data é obrigatória" }),
  
  horario: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: "Horário inválido. Use formato HH:MM" }),
  
  valor: z.number()
    .positive({ message: "Valor deve ser positivo" })
    .optional(),
  
  client_id: z.string()
    .uuid({ message: "Cliente inválido" }),
  
  metodo_pagamento: z.enum(['dinheiro', 'pix', 'cartao', 'transferencia'])
    .optional(),
});

// Profile update schema
export const profileUpdateSchema = z.object({
  nome: z.string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  
  profissao: z.string()
    .trim()
    .max(100, { message: "Profissão deve ter no máximo 100 caracteres" }),
  
  especialidade: z.string()
    .trim()
    .max(200, { message: "Especialidade deve ter no máximo 200 caracteres" })
    .optional()
    .or(z.literal('')),
  
  telefone: phoneSchema.optional().or(z.literal('')),
  
  crp: z.string()
    .trim()
    .max(20, { message: "CRP deve ter no máximo 20 caracteres" })
    .optional()
    .or(z.literal('')),
  
  cpf_cnpj: cpfSchema,
  
  bio: z.string()
    .trim()
    .max(1000, { message: "Bio deve ter no máximo 1000 caracteres" })
    .optional()
    .or(z.literal('')),
});

// Export types for TypeScript
export type ClientRegistrationData = z.infer<typeof clientRegistrationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type SessionData = z.infer<typeof sessionSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
