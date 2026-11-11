import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from 'tailwindcss';
export default defineConfig({root:'web',plugins:[vue()],css:{postcss:{plugins:[tailwindcss({content:['./web/**/*.{html,vue,ts}'],corePlugins:{preflight:false}})]}},server:{proxy:{'/api':'http://localhost:3000'}},build:{outDir:'../dist',emptyOutDir:true}});
