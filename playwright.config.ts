import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'**/*.spec.ts',fullyParallel:false,use:{baseURL:'http://localhost:3000',launchOptions:{channel:'msedge'},headless:true},reporter:'list'});
