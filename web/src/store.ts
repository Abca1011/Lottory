import {defineStore} from 'pinia';import {ref} from 'vue';
export const useSlip=defineStore('slip',()=>{const text=ref('');const permutationRule=ref(true);const rates=ref({top3:'',tod3:'',top2:'',bottom2:''});return{text,permutationRule,rates};});
