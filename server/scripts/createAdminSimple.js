#!/usr/bin/env node
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/teatime';

async function main() {
  const argv = process.argv.slice(2);
  if (!argv[0] || !argv[1]) {
    console.log('Usage: node createAdminSimple.js <email> <password>');
    process.exit(1);
  }
  const [email, password] = argv;
  console.log('Connecting to', MONGO_URI);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  });
  const Admin = mongoose.model('Admin_simple', adminSchema, 'admins');

  try {
    const hash = await bcrypt.hash(password, 10);
    const existing = await Admin.findOne({ email: email.toLowerCase() }).exec();
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
