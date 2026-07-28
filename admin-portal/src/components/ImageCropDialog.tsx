import { useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Slider
} from '@mui/material';
import CropRounded from '@mui/icons-material/CropRounded';
import { getSquareCrop } from '../utils/imageCrop';

interface ImageCropDialogProps {
  file?: File;
  open: boolean;
  onClose: () => void;
  onApply: (file: File, width: number, height: number) => void;
}

const PREVIEW_SIZE = 720;
const OUTPUT_SIZE = 1200;

export function ImageCropDialog({ file, open, onClose, onApply }: ImageCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement>();
  const [zoom, setZoom] = useState(1);
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file || !open) return;
    const objectUrl = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      setImage(nextImage);
      setZoom(1);
      setHorizontalPosition(50);
      setVerticalPosition(50);
      setError('');
    };
    nextImage.onerror = () => setError('This image could not be opened in the editor.');
    nextImage.src = objectUrl;
    return () => {
      URL.revokeObjectURL(objectUrl);
      setImage(undefined);
    };
  }, [file, open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const crop = getSquareCrop(
      image.naturalWidth,
      image.naturalHeight,
      zoom,
      horizontalPosition,
      verticalPosition,
    );
    context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      crop.sourceX,
      crop.sourceY,
      crop.sourceSize,
      crop.sourceSize,
      0,
      0,
      PREVIEW_SIZE,
      PREVIEW_SIZE,
    );
  }, [image, zoom, horizontalPosition, verticalPosition]);

  async function applyCrop() {
    if (!image || !file) return;
    setProcessing(true);
    setError('');
    try {
      const crop = getSquareCrop(
        image.naturalWidth,
        image.naturalHeight,
        zoom,
        horizontalPosition,
        verticalPosition,
      );
      const output = document.createElement('canvas');
      output.width = OUTPUT_SIZE;
      output.height = OUTPUT_SIZE;
      const context = output.getContext('2d');
      if (!context) throw new Error('Canvas editing is unavailable in this browser.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        crop.sourceX,
        crop.sourceY,
        crop.sourceSize,
        crop.sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          result => result ? resolve(result) : reject(new Error('The cropped image could not be created.')),
          'image/jpeg',
          0.92,
        )
      );
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'level-image';
      onApply(new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg', lastModified: Date.now() }), OUTPUT_SIZE, OUTPUT_SIZE);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The image could not be cropped.');
    } finally {
      setProcessing(false);
    }
  }

  return <Dialog open={open} onClose={processing ? undefined : onClose} fullWidth maxWidth="md">
    <DialogTitle>Edit and crop image</DialogTitle>
    <DialogContent>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <div className="crop-editor">
        <div className="crop-preview">
          <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE}/>
          <span>1200 × 1200 output</span>
        </div>
        <div className="crop-controls">
          <div>
            <b>Zoom</b>
            <small>Move closer to the important part of the image.</small>
            <Slider min={1} max={3} step={0.01} value={zoom} onChange={(_, value) => setZoom(value as number)} valueLabelDisplay="auto"/>
          </div>
          <div>
            <b>Horizontal position</b>
            <small>Move the crop from left to right.</small>
            <Slider min={0} max={100} value={horizontalPosition} onChange={(_, value) => setHorizontalPosition(value as number)}/>
          </div>
          <div>
            <b>Vertical position</b>
            <small>Move the crop from top to bottom.</small>
            <Slider min={0} max={100} value={verticalPosition} onChange={(_, value) => setVerticalPosition(value as number)}/>
          </div>
          {image && <Alert severity={image.naturalWidth < 720 || image.naturalHeight < 720 ? 'warning' : 'info'}>
            Source: {image.naturalWidth} × {image.naturalHeight}. The editor produces a validated 1200 × 1200 JPEG.
          </Alert>}
        </div>
      </div>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={processing}>Cancel</Button>
      <Button variant="contained" startIcon={<CropRounded/>} onClick={applyCrop} disabled={!image || processing}>
        {processing ? 'Preparing image…' : 'Apply crop'}
      </Button>
    </DialogActions>
  </Dialog>;
}
