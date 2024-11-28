import { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

interface UseAxiosResponse<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    makeRequest: (url: string, method?: string, requestData?: any) => void;
    cancelRequest: () => void;
}

interface UseAxiosConfig extends AxiosRequestConfig {
    baseURL?: string;
    headers?: { [key: string]: string };
}

const isReady = (): boolean => {
    return typeof window !== "undefined" && typeof window.document !== "undefined"
        ? true
        : false;
};

export const useAxios = <T>(config: UseAxiosConfig = {}): UseAxiosResponse<T> => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cancelled, setCancelled] = useState(false);

    const axiosInstance = axios.create({
        baseURL: config.baseURL || '',
        headers: config.headers || {},
    });

    const cancelRequest = () => setCancelled(true);

    const makeRequest = useCallback(
        async (url: string, method = 'GET', requestData: any = {}) => {
            if (cancelled) return;

            setLoading(true);
            setError(null);

            try {
                const response: AxiosResponse<T> = await axiosInstance({
                    url,
                    method,
                    data: requestData,
                    params: method === 'GET' ? requestData : undefined,
                });

                if (!cancelled) {
                    setData(response.data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof AxiosError ? err.message : 'An error occurred');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        },
        [cancelled, axiosInstance]
    );

    useEffect(() => {
        return () => cancelRequest();
    }, []);

    return {
        data,
        loading,
        error,
        makeRequest,
        cancelRequest,
    };
};

export const useAdvReducer = <State, Action extends { type: string }>(
    initialState: State,
    actions: Record<string, (state: State, action: Action) => State>
) => (state: State = initialState, action: Action): State => {
    if (actions[action.type]) {
        return actions[action.type](state, action);
    }
    return state;
};

interface FetchState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

export function useFetch<T>(url: string): FetchState<T> {
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error: ${response.statusText}`);
                const data: T = await response.json();
                setState({ data, loading: false, error: null });
            } catch (error) {
                setState({ data: null, loading: false, error: (error as Error).message });
            }
        };

        fetchData();
    }, [url]);

    return state;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = (value: T) => {
        try {
            setStoredValue(value);
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error saving to localStorage', error);
        }
    };

    return [storedValue, setValue];
}


export function useToggle(initialValue: boolean = false): [boolean, () => void] {
    const [value, setValue] = useState(initialValue);

    const toggle = () => setValue((prev) => !prev);

    return [value, toggle];
}

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

export function useThrottle<T>(value: T, limit: number): T {
    const [throttledValue, setThrottledValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setThrottledValue(value), limit);
        return () => clearTimeout(handler);
    }, [value, limit]);

    return throttledValue;
}

export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    });

    return ref.current;
}

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQueryList = window.matchMedia(query);
        const updateMatch = () => setMatches(mediaQueryList.matches);

        updateMatch();
        mediaQueryList.addEventListener('change', updateMatch);

        return () => mediaQueryList.removeEventListener('change', updateMatch);
    }, [query]);

    return matches;
}

export function useClipboard(): [boolean, (text: string) => Promise<void>] {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (error) {
            console.error('Failed to copy text to clipboard', error);
        }
    };

    return [copied, copyToClipboard];
}


export function useInterval(callback: () => void, delay: number | null): void {
    const savedCallback = useRef<() => void>();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) return;

        const tick = () => savedCallback.current?.();
        const id = setInterval(tick, delay);
        return () => clearInterval(id);
    }, [delay]);
}


interface WindowSize {
    width: number;
    height: number;
}

export function useWindowSize(): WindowSize {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
}

export function useKeyPress(targetKey: string): boolean {
    const [isKeyPressed, setIsKeyPressed] = useState(false);

    const handleKeyDown = ({ key }: KeyboardEvent) => {
        if (key === targetKey) setIsKeyPressed(true);
    };

    const handleKeyUp = ({ key }: KeyboardEvent) => {
        if (key === targetKey) setIsKeyPressed(false);
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [targetKey]);

    return isKeyPressed;
}

export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

interface ScrollPosition {
    x: number;
    y: number;
}

export function useScrollPosition(): ScrollPosition {
    const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
        x: window.scrollX,
        y: window.scrollY,
    });

    useEffect(() => {
        const handleScroll = () => {
            setScrollPosition({
                x: window.scrollX,
                y: window.scrollY,
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return scrollPosition;
}


export function useTimeout(callback: () => void, delay: number | null): void {
    const savedCallback = useRef<() => void>();

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) return;

        const timer = setTimeout(() => savedCallback.current?.(), delay);
        return () => clearTimeout(timer);
    }, [delay]);
}


export function useDarkMode(): [boolean, () => void] {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    const toggleDarkMode = () => {
        setIsDarkMode((prevMode) => !prevMode);
        document.body.classList.toggle('dark-mode', !isDarkMode);
    };

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return [isDarkMode, toggleDarkMode];
}

interface FormState<T> {
    values: T;
    errors: Partial<Record<keyof T, string>>;
}

export function useForm<T extends Record<string, any>>(initialValues: T) {
    const [formState, setFormState] = useState<FormState<T>>({
        values: initialValues,
        errors: {},
    });

    const handleChange = (name: keyof T, value: any) => {
        setFormState((prev) => ({
            ...prev,
            values: { ...prev.values, [name]: value },
        }));
    };

    const validate = (validators: Partial<Record<keyof T, (value: any) => string | null>>) => {
        const errors: Partial<Record<keyof T, string>> = {};
        Object.entries(validators).forEach(([key, validator]) => {
            const error = validator?.(formState.values[key as keyof T]);
            if (error) errors[key as keyof T] = error;
        });
        setFormState((prev) => ({ ...prev, errors }));
        return Object.keys(errors).length === 0;
    };

    return {
        values: formState.values,
        errors: formState.errors,
        handleChange,
        validate,
    };
}


export function useArray<T>(initialArray: T[]) {
    const [array, setArray] = useState(initialArray);

    return {
        array,
        set: setArray,
        push: (item: T) => setArray((prev) => [...prev, item]),
        removeByIndex: (index: number) => setArray((prev) => prev.filter((_, i) => i !== index)),
        clear: () => setArray([]),
    };
}


export function useStep<T>(steps: T[]) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const next = () => setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1));
    const previous = () => setCurrentStepIndex((i) => Math.max(i - 1, 0));
    const reset = () => setCurrentStepIndex(0);

    return {
        currentStep: steps[currentStepIndex],
        currentStepIndex,
        next,
        previous,
        reset,
        isFirstStep: currentStepIndex === 0,
        isLastStep: currentStepIndex === steps.length - 1,
    };
}

export function useTimeoutFn(callback: () => void, delay: number | null) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const reset = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (delay !== null) timeoutRef.current = setTimeout(callback, delay);
    };

    const clear = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    useEffect(() => {
        reset();
        return clear;
    }, [callback, delay]);

    return { reset, clear };
}


export function useDebouncedCallback(callback: () => void, delay: number) {
    const { reset, clear } = useTimeoutFn(callback, delay);

    const debouncedCallback = useCallback(() => {
        clear();
        reset();
    }, [clear, reset]);

    return debouncedCallback;
}

export function useScrollLock(lock: boolean) {
    useEffect(() => {
        if (lock) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [lock]);
}

export function useResizeObserver<T extends HTMLElement>(ref: RefObject<T>): WindowSize | null {
    const [size, setSize] = useState<WindowSize | null>(null);

    useEffect(() => {
        const handleResize = (entries: ResizeObserverEntry[]) => {
            const entry = entries[0];
            if (entry) {
                setSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        };

        const observer = new ResizeObserver(handleResize);
        if (ref.current) observer.observe(ref.current);

        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, [ref]);

    return size;
}

interface MousePosition {
    x: number;
    y: number;
}

export function useMousePosition(): MousePosition {
    const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            setPosition({ x: event.clientX, y: event.clientY });
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return position;
}

type ScrollDirection = 'up' | 'down';

export function useScrollDirection(): ScrollDirection {
    const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('up');
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setScrollDirection(currentScrollY > lastScrollY ? 'down' : 'up');
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return scrollDirection;
}

export function useImageLoader(src: string): { loaded: boolean; error: boolean } {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = src;

        const handleLoad = () => setLoaded(true);
        const handleError = () => setError(true);

        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);

        return () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
        };
    }, [src]);

    return { loaded, error };
}


export function usePersistedState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : initialValue;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
}

export function useReducedMotion(): boolean {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return reducedMotion;
}

export function useCookie(key: string): [string | null, (value: string, options?: any) => void, () => void] {
    const [cookie, setCookieState] = useState(() => document.cookie.split('; ').find((row) => row.startsWith(key))?.split('=')[1] || null);

    const setCookie = (value: string, options: Record<string, any> = {}) => {
        const optionsString = Object.entries(options)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
        document.cookie = `${key}=${value}; ${optionsString}`;
        setCookieState(value);
    };

    const deleteCookie = () => {
        document.cookie = `${key}=; Max-Age=0`;
        setCookieState(null);
    };

    return [cookie, setCookie, deleteCookie];
}

export function useFetchRetry<T>(url: string, options: RequestInit, retries: number = 3): { data: T | null; error: string | null; loading: boolean } {
    const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
        data: null,
        error: null,
        loading: true,
    });

    useEffect(() => {
        const fetchData = async () => {
            let attempts = 0;
            while (attempts < retries) {
                try {
                    const response = await fetch(url, options);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const data: T = await response.json();
                    setState({ data, error: null, loading: false });
                    return;
                } catch (error) {
                    attempts++;
                    if (attempts >= retries) {
                        setState({ data: null, error: (error as Error).message, loading: false });
                    }
                }
            }
        };

        fetchData();
    }, [url, options, retries]);

    return state;
}

export function useDelay<T>(value: T, delay: number): T {
    const [delayedValue, setDelayedValue] = useState(value);

    useEffect(() => {
        const timeout = setTimeout(() => setDelayedValue(value), delay);
        return () => clearTimeout(timeout);
    }, [value, delay]);

    return delayedValue;
}

export function useVisibilityChange(): boolean {
    const [isVisible, setIsVisible] = useState(document.visibilityState === 'visible');

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(document.visibilityState === 'visible');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return isVisible;
}

export function useDebouncedValue<T>(value: T, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export type Status = 'idle' | 'pending' | 'success' | 'error';
export type AsyncFunction<T> = () => Promise<T>;

export interface UseAsyncReturn<T> {
    execute: () => void;
    status: Status;
    value: T | null;
    error: Error | null;
}

export function useAsync<T>(
    asyncFunction: AsyncFunction<T>,
    immediate: boolean = true,
): UseAsyncReturn<T> {
    const [status, setStatus] = useState<Status>('idle');
    const [value, setValue] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const execute = useCallback(async () => {
        setStatus('pending');
        setValue(null);
        setError(null);

        try {
            const response = await asyncFunction();
            setValue(response);
            setStatus('success');
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setStatus('error');
        }
    }, [asyncFunction]);

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return { execute, status, value, error };
}

export type ScriptStatus = 'loading' | 'ready' | 'error' | 'unknown';

const cachedScriptStatuses: Record<string, ScriptStatus> = {};

export function useScript(src: string, removeOnUnmount: boolean = false): ScriptStatus {
    const isScriptExisting = document.querySelector(`script[src="${src}"]`);
    const cachedStatus = cachedScriptStatuses[src];

    const [status, setStatus] = useState<ScriptStatus>(
        cachedStatus || (isScriptExisting ? 'ready' : 'loading'),
    );

    useEffect(() => {
        if (typeof window === 'undefined' || isScriptExisting) {
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        const handleLoad = () => {
            setStatus('ready');
            cachedScriptStatuses[src] = 'ready';
        };
        const handleError = () => {
            setStatus('error');
            cachedScriptStatuses[src] = 'error';
        };

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);

        document.body.appendChild(script);

        return () => {
            script.removeEventListener('load', handleLoad);
            script.removeEventListener('error', handleError);

            if (removeOnUnmount) {
                document.body.removeChild(script);
            }
        };
    }, [src, removeOnUnmount]);

    return status;
}

export function useIndexedDB<T>(dbName: string, storeName: string) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const request = indexedDB.open(dbName, 1);
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const getRequest = store.getAll();

                    getRequest.onsuccess = () => {
                        setData(getRequest.result as any);
                    };

                    getRequest.onerror = () => {
                        setError(new Error('Failed to fetch data from IndexedDB'));
                    };
                };

                request.onerror = () => {
                    setError(new Error('Failed to open IndexedDB'));
                };
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
            }
        };

        fetchData();
    }, [dbName, storeName]);

    return { data, error };
}

export function useGeoLocation() {
    const [position, setPosition] = useState<GeolocationPosition | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const success = (pos: GeolocationPosition) => {
            setPosition(pos);
        };

        const failure = (err: GeolocationPositionError) => {
            setError(new Error(`Geolocation error: ${err.message}`));
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(success, failure);
        } else {
            setError(new Error('Geolocation not supported'));
        }
    }, []);

    return { position, error };
}

export function useTimer(initialTime: number) {
    const [time, setTime] = useState<number>(initialTime);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        try {
            const intervalId = setInterval(() => {
                setTime((prevTime) => prevTime - 1);
            }, 1000);

            return () => clearInterval(intervalId);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to start timer'));
        }
    }, []);

    return { time, error };
}

export function useIsMounted() {
    const [isMounted, setIsMounted] = useState<boolean>(false);

    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    return isMounted;
}

export function useCss(css: string) {
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        try {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);

            return () => {
                document.head.removeChild(style);
            };
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to apply CSS'));
        }
    }, [css]);

    return { error };
}

export function useSpeak(text: string) {
    const [error, setError] = useState<Error | null>(null);

    const speak = () => {
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.speak(utterance);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to speak'));
        }
    };

    return { speak, error };
}

export function useCountUp(target: number, duration: number) {
    const [count, setCount] = useState<number>(0);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        try {
            let startTime = Date.now();
            const intervalId = setInterval(() => {
                const elapsed = Date.now() - startTime;
                setCount(Math.min(target, (elapsed / duration) * target));

                if (count >= target) clearInterval(intervalId);
            }, 1000);

            return () => clearInterval(intervalId);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to count up'));
        }
    }, [target, duration]);

    return { count, error };
}

export function useCountDown(start: number) {
    const [count, setCount] = useState<number>(start);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        try {
            if (count <= 0) return;

            const intervalId = setInterval(() => {
                setCount((prevCount) => Math.max(0, prevCount - 1));
            }, 1000);

            return () => clearInterval(intervalId);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to start countdown'));
        }
    }, [count]);

    return { count, error };
}

interface BatteryManager {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    addEventListener(
        type: string,
        listener: EventListener | EventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListener | EventListenerObject | null,
        options?: boolean | EventListenerOptions,
    ): void;
}

interface BatteryState {
    supported: boolean;
    loading: boolean;
    level: number | null;
    charging: boolean | null;
    chargingTime: number | null;
    dischargingTime: number | null;
}

interface NavigatorWithBattery extends Navigator {
    getBattery: () => Promise<BatteryManager>;
}

export const useBattery = (): BatteryState => {
    const [batteryState, setBatteryState] = useState<BatteryState>({
        supported: true,
        loading: true,
        level: null,
        charging: null,
        chargingTime: null,
        dischargingTime: null,
    });

    useEffect(() => {
        if (!isReady()) {
            setBatteryState((prevState) => ({
                ...prevState,
                supported: false,
                loading: false,
            }));
            return;
        }

        const _navigator = navigator as NavigatorWithBattery;
        let battery: BatteryManager | null = null;

        const handleBatteryChange = () => {
            if (battery) {
                setBatteryState({
                    supported: true,
                    loading: false,
                    level: battery.level,
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime,
                });
            }
        };

        _navigator.getBattery().then((_battery) => {
            battery = _battery;
            handleBatteryChange();

            _battery.addEventListener('levelchange', handleBatteryChange);
            _battery.addEventListener('chargingchange', handleBatteryChange);
            _battery.addEventListener('chargingtimechange', handleBatteryChange);
            _battery.addEventListener('dischargingtimechange', handleBatteryChange);
        });

        return () => {
            if (battery) {
                battery.removeEventListener('levelchange', handleBatteryChange);
                battery.removeEventListener('chargingchange', handleBatteryChange);
                battery.removeEventListener('chargingtimechange', handleBatteryChange);
                battery.removeEventListener('dischargingtimechange', handleBatteryChange);
            }
        };
    }, []);

    return batteryState;
};

export const useEventListener = (
    eventName: string,
    handler: (event: Event) => void,
    elementRef?: React.RefObject<HTMLElement>,
    options?: boolean | AddEventListenerOptions
) => {
    const savedHandler = useRef<(event: Event) => void>();

    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        const element = (elementRef && elementRef.current) || window;
        if (!isReady() || !element) return;

        const eventListener = (event: Event) => {
            if (savedHandler.current) {
                savedHandler.current(event);
            }
        };

        element.addEventListener(eventName, eventListener, options);

        return () => {
            element.removeEventListener(eventName, eventListener, options);
        };
    }, [eventName, elementRef, options]);
};

interface HistoryState {
    [key: string]: any;
}

interface UseHistory {
    history: History;
    state: HistoryState | null;
    push: (path: string, state?: HistoryState) => void;
    replace: (path: string, state?: HistoryState) => void;
    goBack: () => void;
    goForward: () => void;
}

export const useHistory = (): UseHistory => {
    const [history, setHistory] = useState<History>(window.history);
    const [state, setState] = useState<HistoryState | null>(null);

    const push = useCallback((path: string, state?: HistoryState) => {
        if (isReady()) {
            window.history.pushState(state, "", path);
            setState(state || null);
        }
    }, []);

    const replace = useCallback((path: string, state?: HistoryState) => {
        if (isReady()) {
            window.history.replaceState(state, "", path);
            setState(state || null);
        }
    }, []);

    const goBack = useCallback(() => {
        if (isReady()) {
            window.history.back();
        }
    }, []);

    const goForward = useCallback(() => {
        if (isReady()) {
            window.history.forward();
        }
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            setState(event.state || null);
        };

        if (isReady()) {
            window.addEventListener("popstate", handlePopState);
            return () => {
                window.removeEventListener("popstate", handlePopState);
            };
        }
    }, []);

    return {
        history,
        state,
        push,
        replace,
        goBack,
        goForward,
    };
};

interface UsePreferredLanguage {
    language: string;
    languages: Array<string>;
    isSupported: boolean;
}

export const usePreferredLanguage = (): UsePreferredLanguage => {
    const [language, setLanguage] = useState<string>(
        isReady() ? navigator.language : ""
    );
    const [languages, setLanguages] = useState<Array<string>>(
        isReady() ? Array.from(navigator.languages) : []
    );
    const [isSupported, setIsSupported] = useState<boolean>(
        isReady() && !!navigator.language
    );

    useEffect(() => {
        if (isReady()) {
            if (navigator.language) {
                setLanguage(navigator.language);
                setIsSupported(true);
            }
            if (navigator.languages && navigator.languages.length > 0) {
                setLanguages(Array.from(navigator.languages));
                setIsSupported(true);
            } else {
                setIsSupported(false);
            }
        } else {
            setIsSupported(false);
        }
    }, []);

    return {
        language,
        languages,
        isSupported,
    };
};


interface UseSessionStorage<T> {
    (key: string, initialValue: T): [T, (value: T) => void];
}

export const useSessionStorage: UseSessionStorage<any> = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        if (!isReady()) {
            return initialValue;
        }
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading sessionStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = (value: any) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (isReady()) {
                window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting sessionStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
};

interface UseSound {
    play: () => void;
    pause: () => void;
    stop: () => void;
    setVolume: (volume: number) => void;
    isPlaying: boolean;
    error: Error | null;
}

export const useSound = (url: string): UseSound => {
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!isReady() || !window.Audio) {
            setError(new Error("Sound is not supported in this environment."));
            return;
        }

        const audioElement = new Audio(url);
        setAudio(audioElement);

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleError = (e: any) => setError(e);

        audioElement.addEventListener("play", handlePlay);
        audioElement.addEventListener("pause", handlePause);
        audioElement.addEventListener("error", handleError);

        return () => {
            audioElement.removeEventListener("play", handlePlay);
            audioElement.removeEventListener("pause", handlePause);
            audioElement.removeEventListener("error", handleError);
            audioElement.pause();
            audioElement.currentTime = 0;
        };
    }, [url]);

    const play = useCallback(() => {
        if (audio) {
            audio.play().catch((e) => setError(e));
        }
    }, [audio]);

    const pause = useCallback(() => {
        if (audio) {
            audio.pause();
        }
    }, [audio]);

    const stop = useCallback(() => {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }, [audio]);

    const setVolume = useCallback(
        (volume: number) => {
            if (audio) {
                audio.volume = volume;
            }
        },
        [audio]
    );

    return {
        play,
        pause,
        stop,
        setVolume,
        isPlaying,
        error,
    };
};

interface TouchPosition {
    x: number | null;
    y: number | null;
}

interface UseTouch {
    (elementRef: React.RefObject<HTMLElement>): {
        touchStart: TouchPosition;
        touchMove: TouchPosition;
        touchEnd: TouchPosition;
    };
}

export const useTouch: UseTouch = (elementRef: React.RefObject<HTMLElement>) => {
    const [touchStart, setTouchStart] = useState<TouchPosition>({
        x: null,
        y: null,
    });
    const [touchMove, setTouchMove] = useState<TouchPosition>({
        x: null,
        y: null,
    });
    const [touchEnd, setTouchEnd] = useState<TouchPosition>({ x: null, y: null });

    const handleTouchStart = useCallback((event: TouchEvent) => {
        const touch = event.touches[0];
        setTouchStart({ x: touch.clientX, y: touch.clientY });
    }, []);

    const handleTouchMove = useCallback((event: TouchEvent) => {
        const touch = event.touches[0];
        setTouchMove({ x: touch.clientX, y: touch.clientY });
    }, []);

    const handleTouchEnd = useCallback(() => {
        setTouchEnd(touchMove);
        setTouchMove({ x: null, y: null });
        setTouchStart({ x: null, y: null });
    }, [touchMove]);

    useEffect(() => {
        if (!isReady() || !elementRef.current) {
            return;
        }

        const element = elementRef.current;
        element.addEventListener("touchstart", handleTouchStart);
        element.addEventListener("touchmove", handleTouchMove);
        element.addEventListener("touchend", handleTouchEnd);

        return () => {
            element.removeEventListener("touchstart", handleTouchStart);
            element.removeEventListener("touchmove", handleTouchMove);
            element.removeEventListener("touchend", handleTouchEnd);
        };
    }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

    return { touchStart, touchMove, touchEnd };
};

export const useUpdateEffect = (
    effect: React.EffectCallback,
    deps: React.DependencyList
) => {
    const isFirstMount = useRef(true);

    useEffect(() => {
        if (!isReady()) {
            return;
        }

        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        return effect();
    }, deps);
};
