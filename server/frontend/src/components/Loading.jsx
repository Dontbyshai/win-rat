function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[rgba(56,54,54,0.25)]">
            <div className="w-[60px] h-[60px] border-[6px] border-[#242424] border-t-[#007bff] rounded-full animate-spin"></div>
        </div>
    );
}

export default Loading;