import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // For admin setup
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function run() {
  console.log("Setting up test users...")
  // We need two users to test RLS
  const { data: userA, error: errA } = await adminClient.auth.admin.createUser({
    email: 'usera@example.com',
    password: 'password123',
    email_confirm: true
  })
  
  const { data: userB, error: errB } = await adminClient.auth.admin.createUser({
    email: 'userb@example.com',
    password: 'password123',
    email_confirm: true
  })

  // If already exists, we might get an error but we can just query for them
  const uidA = userA?.user?.id ?? (await adminClient.from('auth.users').select('id').eq('email', 'usera@example.com').single()).data?.id
  const uidB = userB?.user?.id ?? (await adminClient.from('auth.users').select('id').eq('email', 'userb@example.com').single()).data?.id

  console.log("User A:", uidA)
  console.log("User B:", uidB)

  // Insert data as admin for User A
  const { data: reminderA, error: insErr } = await adminClient.from('reminder_items').insert({
    user_id: uidA,
    category: 'task',
    name: 'Test Task for A'
  }).select('id').single()

  if (insErr) {
    console.error("Error inserting data", insErr)
    process.exit(1)
  }

  const reminderId = reminderA.id

  await adminClient.from('task_details').insert({
    reminder_item_id: reminderId,
    due_at: new Date().toISOString()
  })

  console.log("Inserted reminder for User A:", reminderId)

  // Now create a client for User B
  const { data: sessionB } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'userb@example.com',
  })
  
  // Actually we can just signInWithPassword
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { error: loginErr } = await clientB.auth.signInWithPassword({
    email: 'userb@example.com',
    password: 'password123'
  })

  if (loginErr) {
    console.error("Failed to login User B", loginErr)
    process.exit(1)
  }

  console.log("Logged in as User B, querying reminders...")
  
  const { data: itemsB } = await clientB.from('reminder_items').select('*')
  const { data: detailsB } = await clientB.from('task_details').select('*')

  console.log(`User B sees ${itemsB?.length || 0} reminder_items (expected 0)`)
  console.log(`User B sees ${detailsB?.length || 0} task_details (expected 0)`)

  if (itemsB?.length === 0 && detailsB?.length === 0) {
    console.log("RLS Test PASSED.")
    process.exit(0)
  } else {
    console.error("RLS Test FAILED.")
    process.exit(1)
  }
}

run().catch(console.error)
