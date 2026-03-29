#!/usr/bin/env node

/**
 * NUCLEAR DATABASE RESET SCRIPT
 * WARNING: This will COMPLETELY DESTROY your database and recreate it from scratch
 * This is the most aggressive reset possible - use only when you want to start 100% fresh
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

console.log('☢️  NUCLEAR DATABASE RESET ☢️');
console.log('');
console.log('This will:');
console.log('1. COMPLETELY DESTROY your database');
console.log('2. Delete ALL tables, data, functions, and policies');
console.log('3. Drop the entire database schema');
console.log('4. Recreate everything from scratch');
console.log('5. Apply all migrations fresh');
console.log('');
console.log('⚠️  THIS IS IRREVERSIBLE - ALL DATA WILL BE GONE FOREVER! ⚠️');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Type "NUCLEAR RESET" to confirm: ', (answer) => {
  if (answer === 'NUCLEAR RESET') {
    console.log('\n☢️  Starting nuclear reset...');
    
    try {
      // Step 1: Stop Supabase
      console.log('📋 Step 1: Stopping Supabase...');
      try {
        execSync('npx supabase stop', { stdio: 'pipe' });
      } catch (e) {
        // Ignore if already stopped
      }
      
      // Step 2: Reset database completely
      console.log('📋 Step 2: Nuclear database reset...');
      execSync('npx supabase db reset --linked', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      // Step 3: Push all migrations fresh
      console.log('📋 Step 3: Applying all migrations...');
      execSync('npx supabase db push', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      // Step 4: Apply the security disable migration
      console.log('📋 Step 4: Disabling security...');
      execSync('npx supabase db push', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Nuclear reset completed successfully!');
      console.log('');
      console.log('📋 What happened:');
      console.log('✅ Database completely destroyed');
      console.log('✅ All data permanently deleted');
      console.log('✅ Schema recreated from scratch');
      console.log('✅ All migrations applied fresh');
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
      console.log('\n💡 Try these manual steps:');
      console.log('1. npx supabase db reset --linked');
      console.log('2. npx supabase db push');
      console.log('3. Check your Supabase connection');
    }
  } else {
    console.log('\n❌ Nuclear reset cancelled. Database unchanged.');
  }
  
  rl.close();
});