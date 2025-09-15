import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Admin } from '../models/Admin';
import { env } from '../config/env';

async function main() {
  const argv = process.argv.slice(2);
  if (!argv[0] || !argv[1]) {
    console.log('Usage: ts-node createAdmin.ts <email> <password>');
    process.exit(1);
  }
  const [email, password] = argv;
  console.log('Connecting to', env.MONGO_URI);
  await mongoose.connect(env.MONGO_URI);
  try {
    const hash = await bcrypt.hash(password, 10);
    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.passwordHash = hash;
      await existing.save();
      console.log('Updated admin:', email);
    } else {
      await Admin.create({ email: email.toLowerCase(), passwordHash: hash });
      console.log('Created admin:', email);
    }
  } catch (err) {
    console.error('Failed to create/update admin', err);
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(2); });
