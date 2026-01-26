import React from 'react';

const HeroSection = ({ onStart }) => {
    return (
        <section className="hero" style={{ minHeight: '80vh' }}>
            <div className="container hero-content">
                <div className="hero-text animate-fade-in" style={{ textAlign: 'center', margin: '0 auto' }}>
                    <div className="badge">POWERED BY AI</div>
                    <h1 style={{ fontSize: 'min(5rem, 12vw)', letterSpacing: '-3px' }}>
                        METAFIT <br />
                        <span className="title-gradient">ESCULPA SEU CORPO</span>
                    </h1>
                    <p style={{ maxWidth: '600px', margin: '0 auto 2.5rem' }}>
                        A plataforma definitiva de fitness baseada em inteligência artificial.
                        Resultados de elite com tecnologia de ponta.
                    </p>
                    <div className="hero-buttons" style={{ justifyContent: 'center' }}>
                        <button className="btn-auth-primary" onClick={onStart}>CRIAR MINHA CONTA</button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
