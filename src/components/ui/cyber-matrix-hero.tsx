"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Scale } from 'lucide-react';

interface CyberMatrixHeroProps {
    title?: string;
    subtitle?: string;
    description?: string;
    badgeText?: string;
    onCtaClick?: () => void;
    ctaText?: string;
}

const CyberMatrixHero: React.FC<CyberMatrixHeroProps> = ({
    title = "LawCraft Protocol",
    description = "A new layer for modern legal architecture. Draft, analyze, and enforce legally sound contracts powered by real-time RAG intelligence and verified government statutes.",
    badgeText = "Legal Intelligence Engine",
    onCtaClick,
    ctaText = "Start Drafting",
}) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !gridRef.current) return;

        const grid = gridRef.current;
        // Law-based characters, symbols, legal terms, section symbols, and justice scales
        const chars = '⚖️§¶LAWJUSTICEVERDICTACTRULESTATUTEPROMISSORYCOURTNDACONTRACTLEGALCRAFT0123456789§¶⚖️';
        let columns = 0;
        let rows = 0;
        
        const createTile = (_index: number) => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            
            tile.onclick = e => {
                const target = e.target as HTMLDivElement;
                target.textContent = chars[Math.floor(Math.random() * chars.length)];
                target.classList.add('glitch');
                setTimeout(() => target.classList.remove('glitch'), 200);
            };

            return tile;
        }

        const createTiles = (quantity: number) => {
            Array.from(Array(quantity)).map((_, index) => {
                grid.appendChild(createTile(index));
            });
        }

        const createGrid = () => {
            grid.innerHTML = '';
            
            const size = 60; // Denser grid
            columns = Math.floor(window.innerWidth / size);
            rows = Math.floor(window.innerHeight / size);
            
            grid.style.setProperty('--columns', columns.toString());
            grid.style.setProperty('--rows', rows.toString());
            
            createTiles(columns * rows);

            // Set initial characters
            for(const tile of Array.from(grid.children) as HTMLDivElement[]) {
                tile.textContent = chars[Math.floor(Math.random() * chars.length)];
            }
        }

        let rafId: number | null = null;
        const handleMouseMove = (e: MouseEvent) => {
            if (rafId) return;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                if (!grid) return;
                const radius = window.innerWidth / 4;
                const children = Array.from(grid.children) as HTMLDivElement[];
                for (let i = 0; i < children.length; i++) {
                    const tile = children[i];
                    const rect = tile.getBoundingClientRect();
                    const tileX = rect.left + rect.width / 2;
                    const tileY = rect.top + rect.height / 2;

                    const distance = Math.sqrt(
                        Math.pow(mouseX - tileX, 2) + Math.pow(mouseY - tileY, 2)
                    );

                    const intensity = Math.max(0, 1 - distance / radius);
                    tile.style.setProperty('--intensity', intensity.toString());
                }
            });
        };

        window.addEventListener('resize', createGrid);
        window.addEventListener('mousemove', handleMouseMove);
        
        createGrid();

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('resize', createGrid);
            window.removeEventListener('mousemove', handleMouseMove);
        };

    }, [isClient]);

    const fadeUpVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.2 + 0.5,
                duration: 0.8,
                ease: "easeInOut",
            },
        }),
    };

    return (
        <div
            className="relative min-h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden"
            style={{
                position: 'relative',
                minHeight: '75vh',
                width: '100%',
                backgroundColor: '#050508',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '4rem 1rem',
            }}
        >
            {/* Animated Grid Background */}
            <div ref={gridRef} id="tiles"></div>
            
            <style>{`
                #tiles {
                    --intensity: 0;
                    display: grid;
                    grid-template-columns: repeat(var(--columns), 1fr);
                    grid-template-rows: repeat(var(--rows), 1fr);
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: auto;
                }
                .tile {
                    position: relative;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 1.1rem;
                    
                    /* Dynamic legal glowing effect */
                    opacity: calc(0.12 + var(--intensity) * 0.88);
                    color: hsl(270, 100%, calc(60% + var(--intensity) * 40%));
                    text-shadow: 0 0 calc(var(--intensity) * 15px) hsl(270, 100%, 65%);
                    transform: scale(calc(1 + var(--intensity) * 0.2));
                    transition: color 0.2s ease, text-shadow 0.2s ease, transform 0.2s ease;
                }
                .tile.glitch {
                    animation: glitch-anim 0.2s ease;
                }
                @keyframes glitch-anim {
                    0% { transform: scale(1); color: #970fff; }
                    50% { transform: scale(1.2); color: #fff; text-shadow: 0 0 10px #fff; }
                    100% { transform: scale(1); color: #970fff; }
                }
            `}</style>

            {/* Overlay Content */}
            <div
                className="relative z-10 text-center p-8 bg-black/70 backdrop-blur-xl rounded-3xl border border-purple-500/20 max-w-3xl mx-4 shadow-2xl"
                style={{
                    position: 'relative',
                    zIndex: 10,
                    textAlign: 'center',
                    padding: '2.5rem',
                    backgroundColor: 'rgba(8, 9, 13, 0.85)',
                    backdropFilter: 'blur(24px)',
                    borderRadius: '1.5rem',
                    border: '1px solid rgba(151, 15, 255, 0.3)',
                    maxWidth: '48rem',
                    margin: '0 1rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                }}
            >
                <motion.div
                    custom={0}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.375rem 1rem',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(151, 15, 255, 0.15)',
                        border: '1px solid rgba(151, 15, 255, 0.4)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <Scale size={16} style={{ color: '#b84dff' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e9d5ff' }}>
                        {badgeText}
                    </span>
                </motion.div>

                <motion.h1
                    custom={1}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                        fontSize: ' clamp(2.5rem, 5vw, 4.5rem)',
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        marginBottom: '1rem',
                        color: '#ffffff',
                        background: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 60%, #b84dff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {title}
                </motion.h1>

                <motion.p
                    custom={2}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                        maxWidth: '42rem',
                        margin: '0 auto 2rem auto',
                        fontSize: '1.125rem',
                        color: '#cbd5e1',
                        lineHeight: 1.625,
                    }}
                >
                    {description}
                </motion.p>

                <motion.div
                    custom={3}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        justifyContent: 'center',
                    }}
                >
                    <button
                        onClick={onCtaClick}
                        style={{
                            padding: '1rem 2rem',
                            background: 'linear-gradient(135deg, #970fff 0%, #6366f1 100%)',
                            color: '#ffffff',
                            fontWeight: 700,
                            borderRadius: '0.75rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 10px 25px rgba(151, 15, 255, 0.4)',
                            transition: 'all 0.3s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '1rem',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 15px 30px rgba(151, 15, 255, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(151, 15, 255, 0.4)';
                        }}
                    >
                        {ctaText}
                        <ArrowRight size={20} />
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

export default CyberMatrixHero;
