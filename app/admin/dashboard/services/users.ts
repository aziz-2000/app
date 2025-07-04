import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface User {
  id: string
  name: string
  email: string
  role: 'طالب' | 'مدرب' | 'مسؤول'
  status: 'نشط' | 'معطل'
  avatar_url?: string
  join_date: string
  created_at: string
}

export const getUsers = async (): Promise<User[]> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('users').select('*')
  if (error) throw error
  return data || []
}

export const getUser = async (id: string): Promise<User> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const createUser = async (user: Omit<User, 'id' | 'created_at'>): Promise<User> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('users').insert({
    ...user,
    join_date: user.join_date || new Date().toISOString().split('T')[0],
    status: user.status || 'نشط',
    avatar_url: user.avatar_url || '/placeholder-user.jpg'
  }).select().single()
  if (error) throw error
  return data
}

export const updateUser = async (id: string, user: Partial<User>): Promise<User> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('users').update(user).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteUser = async (id: string): Promise<void> => {
  const supabase = createClientComponentClient()
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

export const toggleUserStatus = async (id: string, currentStatus: 'نشط' | 'معطل'): Promise<User> => {
  return updateUser(id, { status: currentStatus === 'نشط' ? 'معطل' : 'نشط' })
}