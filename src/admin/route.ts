import { httpError, requireField } from "../../utils/errors.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { server } from "../../lib/fastify.js";

server.post('/api/admin/create-rider', async (req, res) => {
  try {
    const admin = supabaseAdmin
    const { email, name } = req.body as any;

    requireField(email && name, 'Email and name are required');
    const tempPassword = name.charAt(0).toUpperCase() + name.slice(1) + '123!';

    const { data: authUsers, error: authCheckError } = await admin.auth.admin.listUsers()
    if (authCheckError) throw httpError(500, 'Error fetching users', authCheckError.message);

    const existingAuthUser = authUsers.users.find(user => user.email === email);
    if (existingAuthUser) {
      const { error: updateError } = await admin
        .from('users')
        .upsert({
          id: existingAuthUser.id,
          email, 
          name,
          role: 'driver',
          created_at: new Date().toISOString()
        }, { 
          onConflict: 'id'
        })

      if (updateError) throw httpError(500, 'Error updating user', updateError.message);
      
      return {
        success: true,
        message: `Rider ${name} created successfully`,
        user: {
          id: existingAuthUser?.id,
          email,
          name
        },
        tempPassword: tempPassword
      }
    }

    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email, 
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'driver'
      }
    })

    if (createError) throw httpError(500, 'Error creating user', createError.message);
    const { error: insertError } = await admin
      .from('users')
      .upsert({
        id: userData.user.id,
        email,
        name,
        role: 'driver',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (insertError) throw httpError(500, 'Error inserting user', insertError.message);
    const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role: 'driver'
      }
    })

    if (emailError) throw httpError(500, 'Error sending invite email', emailError.message);
    return {
      success: true,
      message: `Rider ${name} created successfully`,
      user: {
        id: userData.user.id,
        email,
        name
      },
      tempPassword: tempPassword
    }
  } catch (error) {
    throw httpError(500, 'Unexpected error creating rider:', error)
  }
})

server.post('/api/admin/create-admin', async (req, res) => {
  try {
    const admin = supabaseAdmin
    const { email, name } = req.body as any;

    requireField(email && name, 'Email and name are required');
    const tempPassword = name.charAt(0).toUpperCase() + name.slice(1) + '123!';

    const { data: authUsers, error: authCheckError } = await admin.auth.admin.listUsers();

    const existingAuthUser = authUsers.users.find(user => user.email === email);
    if (existingAuthUser) {
        const { error: updateError } = await admin
          .from('users')
          .upsert({
            id: existingAuthUser.id,
            email,
            name,
            role: 'admin',
            created_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
        
        if (updateError) throw httpError(400, "Error updating existing user:", updateError.message)

        return {
          success: true,
          message: `Admin ${name} updated successfully`,
          user: {
            id: existingAuthUser.id,
            email,
            name
          },
          tempPassword: tempPassword
        }
      }

      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'admin'
        }
      })

      if (createError) throw httpError(400, 'Erro creating admin user:', createError.message)
      
      const { error: insertError } = await admin
        .from('users')
        .upsert({
          id: userData.user.id,
          email,
          name,
          role: 'admin',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (insertError) {
        await admin.auth.admin.deleteUser(userData.user.id)
        throw httpError(400, 'Error inserting data in the database:', insertError.message)
      }

      const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          name, 
          role: 'admin'
        }
      })

      if (emailError) console.log('Error sending invite email:', emailError.message)

      return {
        success: true,
        message: `Admin ${name} created successfully`,
        user: {
          id: userData.user.id,
          email,
          name
        },
        tempPassword: tempPassword
      }
  } catch (error) {
    throw httpError(500, 'Unexpected error creating admin:', error)
  }
})

server.post('/api/admin/change-password', async (req, res) => {
  try {
    const admin = supabaseAdmin
    const { userId, currentPassword, newPassword } = await req.body as any
    requireField(userId && currentPassword && newPassword, 'userId, currentPassword and newPassword are requested')
    requireField(newPassword.length < 8, 'Password must be at least 8 characters')

    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'user', 'test']
    if (weakPasswords.includes(newPassword.toLowerCase())) throw httpError(400, 'The password is too common, avoid classic patterns and retry.')

    const { data: user, error: userError } = await admin.auth.admin.getUserById(userId)
    if (userError) throw httpError(404, 'User not found')

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (updateError) throw httpError(400, 'Error changing the password:', updateError.message)
    return {
      success: true,
      message: 'Password changed successfully'
    }
  } catch (error) {
    throw httpError(500, 'Unexpected error changing the password:', error)
  }
})
