import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    padding: '2rem', color: '#000', background: '#fff',
                    fontFamily: 'sans-serif', zIndex: 99999, overflow: 'auto'
                }}>
                    <h1>Ops! Algo deu errado.</h1>
                    <p>Ocorreu um erro inesperado na aplicação. Tente recarregar a página.</p>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', background: '#eee', padding: '1rem', borderRadius: '8px', color: '#333' }}>
                        <summary>Detalhes do Erro (Técnico)</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '2rem', padding: '10px 20px', fontSize: '1rem', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                        Recarregar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
