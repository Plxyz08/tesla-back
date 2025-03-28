import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export const uploadFile = async (
  fileBuffer: Buffer,
  filePath: string,
  contentType: string
): Promise<{ url: string }> => {
  try {
    // Generar un nombre único para el archivo si no se proporciona uno
    if (!filePath) {
      const fileExtension = contentType.split('/')[1] || 'bin';
      filePath = `uploads/${uuidv4()}.${fileExtension}`;
    }

    // Subir el archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from('files')
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('Error al subir archivo:', error);
      throw error;
    }

    // Obtener la URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl };
  } catch (error) {
    console.error('Error en el servicio de almacenamiento:', error);
    throw error;
  }
};

export const getFileUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('files')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('files')
      .remove([filePath]);

    if (error) {
      console.error('Error al eliminar archivo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en el servicio de almacenamiento:', error);
    return false;
  }
};

