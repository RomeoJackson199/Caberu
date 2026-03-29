#!/usr/bin/env node

/**
 * Script to completely reset the database
 * WARNING: This will DELETE ALL DATA and recreate the database from scratch
 * Use only when you want to start completely fresh
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🗑️  DATABASE RESET SCRIPT 🗑️');
console.log('');
console.log('This will:');
console.log('1. Drop ALL tables in your database');
console.log('2. Delete ALL data permanently');
console.log('3. Recreate the database schema from migrations');
console.log('4. Start with a completely fresh database');
console.log('');
console.log('⚠️  ALL DATA WILL BE LOST FOREVER! ⚠️');
console.log('');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Type "DELETE ALL DATA" to confirm: ', (answer) => {
  if (answer === 'DELETE ALL DATA') {
    console.log('\n🔄 Starting database reset...');
    
    try {
      // Step 1: Reset the database completely
      console.log('📋 Step 1: Resetting database...');
      execSync('npx supabase db reset', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Database reset completed successfully!');
      console.log('');
      console.log('📋 What happened:');
      console.log('✅ All tables dropped');
      console.log('✅ All data deleted');
      console.log('✅ Database schema recreated from migrations');
      console.log('✅ Fresh database ready for use');
      console.log('');
      console.log('🔧 Next steps:');
      console.log('1. Your database is now completely empty');
      console.log('2. All migrations have been reapplied');
      console.log('3. You can start adding new data');
      console.log('4. No security restrictions (RLS disabled)');
      console.log('');
      console.log('💡 To verify the reset:');
      console.log('npx supabase db diff');
      
    } catch (error) {
      console.error('\n❌ Error during database reset:', error.message);
      console.log('\n💡 Try running manually: npx supabase db reset');
      console.log('💡 Or check your Supabase connection');
    }
  } else {
    console.log('\n❌ Reset cancelled. Database unchanged.');
  }
  
  rl.close();
});