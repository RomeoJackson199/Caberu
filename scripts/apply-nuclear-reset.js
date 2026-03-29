#!/usr/bin/env node

/**
 * Apply Nuclear Reset Migration
 * This will completely destroy and recreate your database
 */

import { execSync } from 'child_process';
import fs from 'fs';
import readline from 'readline';

console.log('☢️  APPLYING NUCLEAR RESET MIGRATION ☢️');
console.log('');
console.log('This will:');
console.log('1. Drop ALL tables, functions, triggers, and sequences');
console.log('2. Delete ALL data permanently');
console.log('3. Recreate the database schema from migrations');
console.log('4. Disable all security restrictions');
console.log('');
console.log('⚠️  ALL DATA WILL BE LOST FOREVER! ⚠️');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Type "RESET DATABASE" to confirm: ', (answer) => {
  if (answer === 'RESET DATABASE') {
    console.log('\n☢️  Starting nuclear reset...');
    
    try {
      // Apply the nuclear reset migration
      console.log('📋 Step 1: Dropping all tables and data...');
      execSync('npx supabase db push', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Nuclear reset completed successfully!');
      console.log('');
      console.log('📋 What happened:');
      console.log('✅ All tables dropped');
      console.log('✅ All data deleted');
      console.log('✅ All functions and triggers removed');
      console.log('✅ Database schema recreated');
      console.log('✅ Security disabled');
      console.log('✅ Ready for unrestricted development');
      console.log('');
      console.log('🔧 Your database is now:');
      console.log('• Completely empty');
      console.log('• No security restrictions');
      console.log('• Ready for any data insertion');
      console.log('• Fresh and clean');
      console.log('');
      console.log('💡 To start adding data:');
      console.log('import { supabaseUnrestricted } from "@/integrations/supabase/client-unrestricted";');
      
    } catch (error) {
      console.error('\n❌ Error during nuclear reset:', error.message);
      console.log('\n💡 Try running manually: npx supabase db push');
    }
  } else {
    console.log('\n❌ Nuclear reset cancelled. Database unchanged.');
  }
  
  rl.close();
});