import React, { useState } from 'react';
import { uploadCommunityImage, addCommunityPost } from '../utils/db';

const AddPostModal = ({ onClose }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('Corrida');
    const [timeText, setTimeText] = useState('');
    const [isFeatured, setIsFeatured] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!imageFile) {
            setError("Selecione uma imagem.");
            setLoading(false);
            return;
        }

        // 1. Upload Image
        const uploadResult = await uploadCommunityImage(imageFile);
        if (uploadResult.error) {
            setError(uploadResult.error);
            setLoading(false);
            return;
        }

        // 2. Add Post to Firestore
        const postData = {
            name,
            type,
            timeText,
            isFeatured,
            image: uploadResult.url
        };

        const addResult = await addCommunityPost(postData);
        if (addResult.error) {
            setError(addResult.error);
        } else {
            onClose(); // Close modal on success
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 6000 }}>
            <div
                className="modal-content animate-fade-in"
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#1a1a1a',
                    padding: '20px',
                    borderRadius: '15px',
                    width: '90%',
                    maxWidth: '400px',
                    border: '1px solid #333'
                }}
            >
                <h2 style={{ marginBottom: '15px', color: '#fff' }}>Adicionar Post (Admin)</h2>

                {error && <p style={{ color: 'red', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</p>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* Image Input */}
                    <div style={{ textAlign: 'center' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            id="post-image-upload"
                        />
                        <label htmlFor="post-image-upload" style={{ cursor: 'pointer' }}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px' }} />
                            ) : (
                                <div style={{
                                    padding: '30px', border: '2px dashed #444',
                                    borderRadius: '10px', color: '#888'
                                }}>
                                    📸 Clique para selecionar imagem
                                </div>
                            )}
                        </label>
                    </div>

                    <input
                        type="text"
                        placeholder="Nome do Usuário (ex: João S.)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        className="input-field"
                        style={{ padding: '10px', background: '#333', border: 'none', color: '#fff', borderRadius: '5px' }}
                    />

                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        style={{ padding: '10px', background: '#333', border: 'none', color: '#fff', borderRadius: '5px' }}
                    >
                        <option value="Corrida">Corrida</option>
                        <option value="Treino em Casa">Treino em Casa</option>
                        <option value="Musculação">Musculação</option>
                        <option value="Desafio">Desafio</option>
                        <option value="Ciclismo">Ciclismo</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Texto de Tempo (ex: Há 3 dias treinando)"
                        value={timeText}
                        onChange={e => setTimeText(e.target.value)}
                        required
                        className="input-field"
                        style={{ padding: '10px', background: '#333', border: 'none', color: '#fff', borderRadius: '5px' }}
                    />

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                        <input
                            type="checkbox"
                            checked={isFeatured}
                            onChange={e => setIsFeatured(e.target.checked)}
                        />
                        Destaque (Borda Dourada)
                    </label>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: '#444', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, padding: '10px' }}>
                            {loading ? 'Enviando...' : 'Publicar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPostModal;
