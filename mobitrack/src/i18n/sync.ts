import i18n from "./index";
import { useLanguageStore } from "../stores/language";

// detect language changes and update i18next
// called once at app startup

export function syncLanguageWithI18n(){
    i18n.changeLanguage(useLanguageStore.getState().language);

    // subscribe to change

    useLanguageStore.subscribe((state)=>{
        if(i18n.language !== state.language){
            i18n.changeLanguage(state.language);
        }
    });

    const unsubscribe = useLanguageStore.subscribe((state) => {
    if (i18n.language !== state.language) {
      i18n.changeLanguage(state.language);
    }
  });
  return unsubscribe;
}