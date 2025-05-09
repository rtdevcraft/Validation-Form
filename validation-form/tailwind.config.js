safelist: [
    // Colors for the "down" state (label as placeholder)
    'peer-placeholder-shown:text-black',
    'peer-placeholder-shown:text-red-500',

    // Colors for the "up" state (label focused or input has value)
    'peer-focus:text-white',
    'peer-[:not(:placeholder-shown)]:text-white',

    // And the positional/size classes for the "up" state, just to be sure
    'peer-focus:top-[-1rem]',
    'peer-focus:-translate-y-0',
    'peer-focus:text-xs',
    'peer-[:not(:placeholder-shown)]:top-[-1rem]',
    'peer-[:not(:placeholder-shown)]:-translate-y-0',
    'peer-[:not(:placeholder-shown)]:text-xs',

    // Base positional/size classes for the "down" state
    'peer-placeholder-shown:top-1/2',
    'peer-placeholder-shown:-translate-y-1/2',
    'peer-placeholder-shown:text-base',
  ],