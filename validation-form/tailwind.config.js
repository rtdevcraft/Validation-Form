module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'text-white',
    'peer-focus:text-white',
    'peer-[:not(:placeholder-shown)]:text-white',
    'text-black',
    'text-red-500',
    'peer-placeholder-shown:text-black',
    'peer-placeholder-shown:text-red-500',
    'peer-focus:top-[-1rem]',
    'peer-focus:-translate-y-0',
    'peer-focus:text-xs',
    'peer-[:not(:placeholder-shown)]:top-[-1rem]',
    'peer-[:not(:placeholder-shown)]:-translate-y-0',
    'peer-[:not(:placeholder-shown)]:text-xs',
  ],
}
