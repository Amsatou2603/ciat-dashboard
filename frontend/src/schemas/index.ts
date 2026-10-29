import { z } from 'zod'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide')
const optDate = z.union([date, z.literal('')])

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Saisissez votre identifiant.').max(150),
  password: z.string().min(1, 'Saisissez votre mot de passe.').max(256),
})
export type LoginValues = z.infer<typeof loginSchema>

export const STATUSES = ['RECU', 'PRESELECTIONNE', 'SELECTIONNE', 'EN_INCUBATION', 'PROTOTYPAGE', 'TERMINE', 'ABANDONNE', 'REJETE'] as const
export const STAGES = ['AUCUN', 'MAQUETTE', 'PROTOTYPE', 'MVP'] as const

/** Miroir des règles serveur (le serveur reste l'autorité : ces contrôles ne servent qu'à guider la saisie). */
export const projectSchema = z.object({
  title: z.string().trim().min(3, 'Le titre doit contenir au moins 3 caractères.').max(200, '200 caractères maximum.'),
  description: z.string().max(4000, '4000 caractères maximum.'),
  cohort: z.string().min(1, 'Choisissez une cohorte.'),
  domain: z.string().min(1, 'Choisissez un domaine.'),
  subdomain: z.string(),
  porteur: z.string().min(1, 'Choisissez un porteur.'),
  mentor: z.string().max(120, '120 caractères maximum.'),
  delay_days: z.coerce.number({ message: 'Nombre attendu.' }).int('Nombre entier attendu.').min(0, 'Minimum 0.').max(3650, 'Valeur improbable.'),
  received_date: date,
  status: z.enum(STATUSES),
  start_date: optDate,
  deadline: optDate,
  progress: z.coerce.number({ message: 'Nombre attendu.' }).int('Nombre entier attendu.').min(0, 'Minimum 0.').max(100, 'Maximum 100.'),
  prototype_stage: z.enum(STAGES),
  prototype_notes: z.string().max(4000),
}).superRefine((v, ctx) => {
  const add = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (v.start_date && v.start_date < v.received_date) add('start_date', 'Le démarrage ne peut pas précéder la réception.')
  if (v.start_date && v.deadline && v.deadline < v.start_date) add('deadline', 'La date limite doit suivre la date de début.')
  if (v.status === 'TERMINE' && v.progress !== 100) add('progress', 'Un projet terminé doit être à 100 %.')
  if ((v.status === 'RECU' || v.status === 'REJETE') && v.progress > 0) add('progress', 'Pas de progression pour une idée reçue ou non retenue.')
  if (v.prototype_stage !== 'AUCUN' && (v.status === 'RECU' || v.status === 'REJETE')) add('prototype_stage', 'Pas de prototype avant la sélection.')
})
export type ProjectFormValues = z.input<typeof projectSchema>
export type ProjectOutput = z.output<typeof projectSchema>

export const porteurSchema = z.object({ full_name: z.string().trim().min(2, 'Nom trop court.').max(120), gender: z.enum(['F', 'M', 'NS']) })

export const partnershipSchema = z.object({
  partner: z.string().min(1, 'Choisissez un partenaire.'),
  nature: z.enum(['TECHNIQUE', 'MENTORAT', 'COMMERCIAL', 'HEBERGEMENT', 'FINANCIER']),
  status: z.enum(['ACTIF', 'DISCUSSION', 'TERMINE']),
  start_date: optDate,
})
export const fundingSchema = z.object({
  partner: z.string().min(1, 'Choisissez un financeur.'),
  amount_xof: z.coerce.number({ message: 'Montant attendu.' }).int('Montant entier attendu.').positive('Le montant doit être positif.').max(10_000_000_000, 'Montant improbable.'),
  status: z.enum(['PROMIS', 'OBTENU']),
  date,
})

export const userSchema = z.object({
  username: z.string().trim().min(3, '3 caractères minimum.').max(150).regex(/^[\w.@+-]+$/, 'Lettres, chiffres et @ . + - _ uniquement.'),
  first_name: z.string().max(150), last_name: z.string().max(150),
  email: z.union([z.literal(''), z.string().email('E-mail invalide.')]),
  role: z.enum(['admin', 'coordinator', 'analyst', 'reader']),
  is_active: z.boolean(),
  password: z.string().max(256),
})
export const askSchema = z.object({ question: z.string().trim().min(3, 'Posez une question plus précise.').max(500, '500 caractères maximum.') })

export type PartnershipValues = z.input<typeof partnershipSchema>
export type PartnershipOutput = z.output<typeof partnershipSchema>
export type FundingValues = z.input<typeof fundingSchema>
export type FundingOutput = z.output<typeof fundingSchema>
export type UserValues = z.input<typeof userSchema>
export type AskValues = z.input<typeof askSchema>
