import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import '../styles/UploadPage.css';

interface UploadFormData {
  image: File | null;
  rating: '' | 'safe' | 'nsfw';
  character: string;
  secretKey: string;
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UploadFormData>({
    image: null,
    rating: '',
    character: '',
    secretKey: '',
  });

  const [previewUrl, setPreviewUrl] = useState<string>('');

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      alert('Image uploaded successfully!');
      navigate('/');
    },
    onError: (error: Error) => {
      if (error.message.includes('Unauthorized')) {
        alert('Error: Invalid secret key');
      } else {
        alert(`Upload failed: ${error.message}`);
      }
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'image') {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setFormData((prev) => ({ ...prev, image: file }));

      // Create preview URL
      if (file) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl('');
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image) {
      alert('Please select an image file');
      return;
    }

    if (!formData.rating) {
      alert('Please select a rating');
      return;
    }

    if (!formData.secretKey) {
      alert('Please enter the secret key');
      return;
    }

    const submitData = new FormData();
    submitData.append('image', formData.image);
    submitData.append('rating', formData.rating);
    submitData.append('character', formData.character);
    submitData.append('secretKey', formData.secretKey);

    uploadMutation.mutate(submitData);
  };

  return (
    <div className='upload-page'>
      <h2>Upload New Image</h2>

      <form onSubmit={handleSubmit} className='upload-form'>
        <div className='form-group'>
          <label htmlFor='image'>Image File *</label>
          <input
            type='file'
            id='image'
            name='image'
            accept='image/*'
            onChange={handleInputChange}
            required
          />
        </div>

        {previewUrl && (
          <div className='preview-container'>
            <img src={previewUrl} alt='Preview' className='preview-image' />
          </div>
        )}

        <div className='form-group'>
          <label htmlFor='rating'>Rating *</label>
          <select
            id='rating'
            name='rating'
            value={formData.rating}
            onChange={handleInputChange}
            required
          >
            <option value=''>Select rating</option>
            <option value='safe'>Safe</option>
            <option value='nsfw'>NSFW</option>
          </select>
        </div>

        <div className='form-group'>
          <label htmlFor='character'>Character Tags</label>
          <input
            type='text'
            id='character'
            name='character'
            value={formData.character}
            onChange={handleInputChange}
            placeholder='Enter character tags separated by commas (e.g., character1, character2)'
          />
          <small className='help-text'>
            Add character names or tags, separated by commas
          </small>
        </div>

        <div className='form-group'>
          <label htmlFor='secretKey'>Secret Key *</label>
          <input
            type='password'
            id='secretKey'
            name='secretKey'
            value={formData.secretKey}
            onChange={handleInputChange}
            required
          />
        </div>

        <button
          type='submit'
          className='submit-button'
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
        </button>

        {uploadMutation.isError && (
          <div className='error-message'>
            {uploadMutation.error?.message || 'Upload failed'}
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadPage;
