import React, { useState, useEffect } from 'react';
import { uploadCommunityImage, addCommunityPost, updateCommunityPost } from '../utils/db'; // Added update

const AddPostModal = ({ onClose, postToEdit = null }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('Treino Concluído');
    const [timeText, setTimeText] = useState('Agora mesmo');
    const [isFeatured, setIsFeatured] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Pre-fill if editing
    useEffect(() => {
        if (postToEdit) {
            setName(postToEdit.name || '');
            setType(postToEdit.type || 'Treino Concluído');
            setTimeText(postToEdit.timeText || 'Agora mesmo');
            setIsFeatured(postToEdit.isFeatured || false);
            if (postToEdit.image) setPreviewUrl(postToEdit.image);
        }
    }, [postToEdit]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageUrl = postToEdit?.image || ''; // Keep existing URL if not changing

            // 1. Upload new image if selected
            if (imageFile) {
                const uploadResult = await uploadCommunityImage(imageFile);
                if (uploadResult.error) {
                    alert('Erro ao enviar imagem: ' + uploadResult.error);
                    setUploading(false);
                    return;
                }
                imageUrl = uploadResult.url;
            } else if (!imageUrl) {
                // Determine random avatar if no image (same logic as before or strict?)
                // For simplified admin tool, let's require image or use current placeholder logic
                imageUrl = `https://i.pravatar.cc/150?u=${name}`;
            }

            const postData = {
                name,
                type,
                timeText,
                image: imageUrl,
                isFeatured,
                // Do not overwrite createdAt if editing
                createdAt: postToEdit ? postToEdit.createdAt : new Date().toISOString()
            };

            if (postToEdit) {
                // UPDATE
                const result = await updateCommunityPost(postToEdit.id, postData);
                if (result.success) {
                    alert('Post atualizado com sucesso!');
                    onClose();
                } else {
                    alert('Erro ao atualizar: ' + result.error);
                }
            } else {
                // CREATE
                const result = await addCommunityPost(postData);
                if (result.success) {
                    alert('Post criado com sucesso!');
                    onClose();
                } else {
                    alert('Erro ao criar: ' + result.error);
                }
            }

        } catch (error) {
            console.error(error);
            alert('Erro inesperado.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                background: '#222', padding: '20px', borderRadius: '15px', width: '90%', maxWidth: '400px',
                border: '1px solid #444'
            }}>
                <h3 style={{ color: '#fff', marginBottom: '15px' }}>
                    {postToEdit ? 'Editar Post ✏️' : 'Adicionar Post (Admin) 🛠️'}
                </h3>

                {/* Removed error display as alerts are used */}

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
