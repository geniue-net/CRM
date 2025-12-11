import { connectDB } from '../db';
import { User } from '../models';
import { hashPassword } from '../utils/security';
import { v4 as uuidv4 } from 'uuid';

async function createAdminUser() {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@acesmaster.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
      return;
    }

    // Create admin user
    const adminUser = new User({
      id: uuidv4(),
      email: 'admin@acesmaster.com',
      password_hash: await hashPassword('admin123'),
      role: 'ADMIN',
      is_active: true,
      created_at: new Date(),
    });

    await adminUser.save();

    console.log('Admin user created successfully!');
    console.log('Email: admin@acesmaster.com');
    console.log('Password: admin123');
    console.log('User ID: ' + adminUser.id);

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();

