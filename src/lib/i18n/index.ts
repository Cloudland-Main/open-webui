import i18next from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { i18n as i18nType } from 'i18next';
import { writable } from 'svelte/store';

// ==========================================
// توابع کمکی برای مدیریت معماری RTL
// ==========================================
const isRtlLanguage = (lang: string) => {
	// آرایه‌ای از کدهای مربوط به زبان‌های راست‌چین
	const rtlLanguages = ['fa', 'fa-IR', 'ar', 'ar-SA', 'he', 'ur'];
	return rtlLanguages.includes(lang);
};

const updateDocumentDirection = (lang: string) => {
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('lang', lang);
		// تنظیم جهت‌گیری راست‌به‌چپ یا چپ‌به‌راست بر اساس زبان تشخیص داده شده
		document.documentElement.dir = isRtlLanguage(lang) ? 'rtl' : 'ltr';
	}
};

// ==========================================
// مدیریت State زبان در Svelte
// ==========================================
const createI18nStore = (i18n: i18nType) => {
	const i18nWritable = writable(i18n);

	i18n.on('initialized', () => {
		i18nWritable.set(i18n);
	});

	i18n.on('loaded', () => {
		i18nWritable.set(i18n);
	});

	i18n.on('added', () => i18nWritable.set(i18n));

	// شنونده رویداد تغییر زبان: اعمال تغییرات DOM به صورت درلحظه
	i18n.on('languageChanged', (lang) => {
		i18nWritable.set(i18n);
		updateDocumentDirection(lang);
	});

	return i18nWritable;
};

// ==========================================
// مدیریت State بارگذاری منابع زبانی
// ==========================================
const createIsLoadingStore = (i18n: i18nType) => {
	const isLoading = writable(false);

	// اگر منابع بارگذاری شده خالی بودند، وضعیت لودینگ را فعال کن
	i18n.on('loaded', (resources) => {
		isLoading.set(Object.keys(resources).length === 0);
	});

	// در صورت شکست در بارگذاری فایل‌های JSON ترجمه
	i18n.on('failedLoading', () => {
		isLoading.set(true);
	});

	return isLoading;
};

// ==========================================
// موتور راه‌اندازی و کانفیگ اصلی i18next
// ==========================================
export const initI18n = (defaultLocale?: string | undefined) => {
	// اگر کاربری با سابقه قبلی وارد شود، تنظیمات از LocalStorage خوانده می‌شود
	const detectionOrder = defaultLocale
		? ['querystring', 'localStorage']
		: ['querystring', 'localStorage', 'navigator'];

	// تغییر استراتژیک: زبان پیش‌فرض (Fallback) سیستم به صورت هاردکد روی فارسی ایران تنظیم شد
	const fallbackDefaultLocale = defaultLocale ? [defaultLocale] : ['fa-IR'];

	// بارگذاری داینامیک فایل‌های ترجمه از پوشه locales
	const loadResource = (language: string, namespace: string) =>
		import(`./locales/${language}/${namespace}.json`);

	i18next
		.use(resourcesToBackend(loadResource))
		.use(LanguageDetector)
		.init({
			debug: false,
			detection: {
				order: detectionOrder,
				caches: ['localStorage'],
				lookupQuerystring: 'lang',
				lookupLocalStorage: 'locale'
			},
			fallbackLng: {
				fr: ['fr-FR'],
				default: fallbackDefaultLocale
			},
			ns: 'translation',
			returnEmptyString: false,
			interpolation: {
				escapeValue: false // در Svelte نیازی به این کار نیست زیرا به صورت ذاتی ایمن‌سازی شده است
			}
		});
};

const i18n = createI18nStore(i18next);
const isLoadingStore = createIsLoadingStore(i18next);

// ==========================================
// توابع عمومی و اکسپورت‌ها
// ==========================================
export const getLanguages = async () => {
	const languages = (await import(`./locales/languages.json`)).default;
	return languages;
};

// تابع تغییر زبان دستی (برای فراخوانی در رابط کاربری تنظیمات)
export const changeLanguage = (lang: string) => {
	updateDocumentDirection(lang);
	i18next.changeLanguage(lang);
};

export default i18n;
export const isLoading = isLoadingStore;
