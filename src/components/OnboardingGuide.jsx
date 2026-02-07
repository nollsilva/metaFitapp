import React from 'react';

const OnboardingGuide = () => {
    return (
        <section className="onboarding-section container">
            <h2 className="onboarding-title">Como o <span className="title-gradient">MetaFit</span> Funciona</h2>
            <div className="onboarding-grid">
                <div className="onboarding-step animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="step-label">PASSO 01</div>
                    <div className="mockup-container">
                        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="m-input" style={{ width: '140px' }}></div>
                            <div className="m-input" style={{ width: '100px' }}></div>
                            <div className="btn-primary-sm" style={{ marginTop: '10px', pointerEvents: 'none' }}>GERAR DIETA</div>
                        </div>
                    </div>
                    <h3>Análise Biométrica</h3>
                    <p>Nossa IA analisa sua biometria, calcula seu IMC e define as metas ideais para queimar gordura ou ganhar massa.</p>
                </div>

                <div className="onboarding-step animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="step-label">PASSO 02</div>
                    <div className="mockup-container">
                        <div className="m-circle"></div>
                        <div style={{ position: 'absolute', fontWeight: '900', color: 'var(--color-primary)', fontSize: '0.8rem' }}>GO!</div>
                    </div>
                    <h3>Treino Interativo</h3>
                    <p>Siga exercícios selecionados com nosso timer de alta performance, garantindo intervalos perfeitos e máxima intensidade.</p>
                </div>
            </div>
        </section>
    );
};

export default OnboardingGuide;
