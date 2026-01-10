import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component to catch React errors and prevent app crashes.
 * Critical for medical-grade software stability.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Error caught by boundary:', error, errorInfo);
        // TODO: Send to error tracking service for medical compliance
    }

    private handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    public render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="fixed inset-0 bg-gradient-to-br from-[#1E1E1E] to-[#121212] flex items-center justify-center p-8">
                    <div className="relative bg-[#1a1a1a] border-2 border-[#6D282C] rounded-lg p-8 max-w-lg text-center shadow-2xl">
                        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none rounded-lg" />

                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#6D282C]/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#ff8fa3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-[#E0E0E0] mb-4 relative z-10">
                            Application Error
                        </h2>

                        <p className="text-gray-400 mb-6 relative z-10">
                            An unexpected error occurred. Please try again or restart the application.
                        </p>

                        {this.state.error && (
                            <div className="bg-black/40 p-3 rounded-lg mb-6 text-left relative z-10">
                                <p className="text-xs text-gray-500 font-mono break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={this.handleRetry}
                            className="group relative py-3 px-8 bg-[#6D282C] border border-[#893338] rounded-sm 
                                       shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                                       transition-all duration-300 ease-out
                                       hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                                       active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                            <span className="relative text-lg font-bold text-white tracking-widest">
                                TRY AGAIN
                            </span>
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
