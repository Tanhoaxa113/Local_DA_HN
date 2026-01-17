"use client";

/**
 * Countdown Timer Component
 * Displays remaining time until a deadline with visual feedback
 */
import { useState, useEffect } from 'react';

/**
 * Format time to display string
 * @param {number} seconds - Total seconds remaining
 * @returns {string} Formatted time string
 */
const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Clock icon
const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

/**
 * CountdownTimer Component
 * @param {Date|string} deadline - Deadline date/time
 * @param {function} onExpire - Callback when timer expires
 * @param {string} label - Optional label text
 * @param {boolean} showIcon - Show clock icon
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 */
export default function CountdownTimer({
    deadline,
    onExpire,
    label = 'Thời gian còn lại',
    showIcon = true,
    size = 'md',
}) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!deadline) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const deadlineTime = new Date(deadline).getTime();
            const diff = Math.floor((deadlineTime - now) / 1000);
            return Math.max(0, diff);
        };

        // Initial calculation
        const initialTime = calculateTimeLeft();
        setTimeLeft(initialTime);
        setIsExpired(initialTime <= 0);

        if (initialTime <= 0) {
            onExpire?.();
            return;
        }

        // Update every second
        const interval = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);

            if (remaining <= 0) {
                setIsExpired(true);
                onExpire?.();
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [deadline, onExpire]);

    // Size classes
    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    // Color based on time remaining
    const getColorClass = () => {
        if (isExpired) return 'text-error';
        if (timeLeft <= 60) return 'text-error animate-pulse'; // Last minute
        if (timeLeft <= 300) return 'text-warning'; // Last 5 minutes
        return 'text-foreground';
    };

    // Progress percentage (assuming 15 min = 900 seconds as max)
    const maxTime = 15 * 60; // 15 minutes
    const progress = Math.min(100, (timeLeft / maxTime) * 100);

    if (isExpired) {
        return (
            <div className={`flex items-center gap-2 ${sizeClasses[size]} text-error`}>
                {showIcon && <ClockIcon />}
                <span className="font-medium">Hết thời gian thanh toán</span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className={`flex items-center gap-2 ${sizeClasses[size]} ${getColorClass()}`}>
                {showIcon && <ClockIcon />}
                <span className="text-muted">{label}:</span>
                <span className="font-bold font-mono">{formatTime(timeLeft)}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ${timeLeft <= 60
                            ? 'bg-error'
                            : timeLeft <= 300
                                ? 'bg-warning'
                                : 'bg-accent'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
