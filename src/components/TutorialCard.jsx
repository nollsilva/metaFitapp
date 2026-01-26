import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import DumbbellIcon from './DumbbellIcon';

const TutorialCard = ({ content, index, totalInStack, totalSteps, onSwipe, randomRotate }) => {
    const controls = useAnimation();
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Rotation based on X movement
    const rotateValue = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    // Only animate the top card (index 0) with a floating effect
    const isTopCard = index === 0;

    const handleDragEnd = async (_, info) => {
        const offsetX = info.offset.x;
        const offsetY = info.offset.y;
        const velocityX = info.velocity.x;
        const velocityY = info.velocity.y;

        // Calculate total distance and speed magnitude
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

        // Swipe Threshold: Drag distance > 100 OR Flick speed > 500
        if (distance > 100 || speed > 500) {
            // Calculate normalized direction vector
            // Avoid division by zero
            const normDistance = distance || 1;
            const directionX = offsetX / normDistance;
            const directionY = offsetY / normDistance;

            // Determine throw magnitude: throw far off screen (e.g., 800px away)
            const throwDistance = 800;

            // Animate "throw" precisely in the direction of the swipe
            await controls.start({
                x: directionX * throwDistance,
                y: directionY * throwDistance,
                opacity: 0,
                transition: { duration: 0.4, ease: "easeOut" } // Smooth physics exit
            });

            onSwipe();
        } else {
            // Snap back if not swiped enough
            controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
        }
    };

    return (
        <motion.div
            style={{
                x,
                y,
                rotate: isTopCard ? rotateValue : randomRotate || 0,
                opacity: isTopCard ? opacity : 1,
                scale: 1 - index * 0.05,
                zIndex: totalInStack - index,
                // Positioning
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                margin: 'auto',
                width: '100%',
                maxWidth: '320px',
                height: '480px',
                // Visuals
                background: 'linear-gradient(145deg, #1a1a1a, #000)',
                borderRadius: '24px',
                boxShadow: index === 0
                    ? '0 0 25px rgba(255, 165, 0, 0.4), 0 20px 50px rgba(0,0,0,0.8)'
                    : '0 10px 30px rgba(0,0,0,0.8)',
                cursor: isTopCard ? 'grab' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                border: '2px solid #D4AF37',
                userSelect: 'none',
                transformOrigin: 'center center' // Better for free rotation
            }}
            drag={isTopCard ? true : false} // Allow True (Free Drag) for top card
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Constraints 0 makes it snap back unless we override logic
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            animate={controls}
        >
            {/* Inner Content Wrapper for Floating Effect */}
            <motion.div
                style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                // Only float if it's top card AND effectively idle (not thrown)
                // But doing conditional logic on drag state here is tricky without state.
                // Simplified: Just keep small float. The drag will override the parent transform.
                animate={isTopCard ? { y: [0, -10, 0] } : {}}
                transition={isTopCard ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : {}}
            >
                {/* Top Left Suit */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.9 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#D4AF37', fontFamily: 'monospace' }}>
                        {content.step}/{totalSteps}
                    </span>
                    <DumbbellIcon size={28} color="#D4AF37" />
                </div>

                {/* Center Content */}
                <div style={{ textAlign: 'center', padding: '0 5px' }}>
                    {content.title && (
                        <h3 style={{
                            fontSize: '2rem',
                            marginBottom: '16px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            background: 'linear-gradient(to bottom, #fff, #bbb)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))'
                        }}>
                            {content.title}
                        </h3>
                    )}
                    <p style={{
                        fontSize: '1.2rem',
                        lineHeight: '1.6',
                        fontWeight: '500',
                        color: '#eee',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                    }}>
                        {content.text}
                    </p>
                </div>

                {/* Bottom Right Suit (Inverted) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'rotate(180deg)', opacity: 0.9 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#D4AF37', fontFamily: 'monospace' }}>
                        {content.step}/{totalSteps}
                    </span>
                    <DumbbellIcon size={28} color="#D4AF37" />
                </div>
            </motion.div>

            {/* Glossy Overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 100%)',
                pointerEvents: 'none', borderRadius: '22px'
            }}></div>

            {/* Inner Border Line */}
            <div style={{
                position: 'absolute',
                top: '6px', left: '6px', right: '6px', bottom: '6px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '18px', pointerEvents: 'none'
            }}></div>

        </motion.div>
    );
};

export default TutorialCard;
