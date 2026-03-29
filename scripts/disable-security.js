#!/usr/bin/env node

/**
 * Script to disable all database security
 * WARNING: This removes all Row Level Security and access restrictions
 * Use only for development/testing purposes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 WARNING: This will disable ALL database security! 🚨');
console.log('This includes:');
console.log('- Row Level Security (RLS) on all tables');
console.log('- All access control policies');
console.log('- User-based data restrictions');
console.log('');
console.log('This should ONLY be used for development/testing purposes.');
console.log('');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    console.log('\n🔄 Applying security disabling migration...');
    
    try {
      // Apply the migration
      execSync('npx supabase db push', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Security successfully disabled!');
      console.log('\n📋 Next steps:');
      console.log('1. All RLS policies have been removed');
      console.log('2. All tables now have unrestricted access');
      console.log('3. You can now insert/update/delete data without authentication');
      console.log('');
      console.log('🔧 To use the unrestricted client in your code:');
      console.log('import { supabaseUnrestricted } from "@/integrations/supabase/client-unrestricted";');
      console.log('');
      console.log('⚠️  REMEMBER: Re-enable security before deploying to production!');
      
    } catch (error) {
      console.error('\n❌ Error applying migration:', error.message);
      console.log('\n💡 Try running manually: npx supabase db push');
    }
  } else {
    console.log('\n❌ Operation cancelled.');
  }
  
  rl.close();
});