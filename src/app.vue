<template>
    <div class="dark:bg-gray-900 min-h-screen flex flex-col justify-center items-center">
        <nav class="absolute inset-x-0 top-0 w-full h-16 flex justify-end items-center px-4">
            <!-- End Nav -->
            <div class="flex items-center space-x-4">
                <!-- GitHub Repo -->
                <a
                    href="https://github.com/ThatGuySam/prefillprompt"
                    target="_blank"
                    class="hover:text-gray-300 text-gray-400"
                >GitHub</a>
            </div>
        </nav>
        <ChatUI />
    </div>
    <UNotifications />
</template>
