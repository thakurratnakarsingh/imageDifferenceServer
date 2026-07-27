import { useEffect, useState } from 'react';
import { Circle, Image as KonvaImage, Layer, Rect, Stage, Text } from 'react-konva';
import type { Difference } from '../types';
import { api } from '../api/client';

function useBitmap(src:string) {
  const [image,setImage]=useState<HTMLImageElement>();
  useEffect(()=>{const next=new Image();next.crossOrigin='anonymous';next.src=src;next.onload=()=>setImage(next);},[src]);
  return image;
}
export function DifferenceCanvas({src,differences,onChanged}:{src:string;differences:Difference[];onChanged:()=>void}) {
  const image=useBitmap(src); const width=620; const height=image?width*image.height/image.width:420;
  async function moved(d:Difference,x:number,y:number) {
    const body=d.shapeType==='circle'?{normalizedX:x/width,normalizedY:y/height}:{normalizedX:x/width,normalizedY:y/height};
    await api.put(`/admin/differences/${d.id}`,body); onChanged();
  }
  return <Stage width={width} height={height} className="review-stage"><Layer><KonvaImage image={image} width={width} height={height}/>
    {differences.filter(d=>d.isActive).map(d=>d.shapeType==='circle'
      ? <Circle key={d.id} x={Number(d.normalizedX)*width} y={Number(d.normalizedY)*height} radius={Number(d.normalizedRadius)*width} stroke="#d8ff52" strokeWidth={3} fill="rgba(216,255,82,.12)" draggable onDragEnd={e=>moved(d,e.target.x(),e.target.y())}/>
      : <Rect key={d.id} x={Number(d.normalizedX)*width} y={Number(d.normalizedY)*height} width={Number(d.normalizedWidth)*width} height={Number(d.normalizedHeight)*height} cornerRadius={8} stroke="#d8ff52" strokeWidth={3} fill="rgba(216,255,82,.12)" draggable onDragEnd={e=>moved(d,e.target.x(),e.target.y())}/>)}
    {differences.filter(d=>d.isActive).map(d=><Text key={`n${d.id}`} x={(Number(d.normalizedX)-(d.shapeType==='circle'?Number(d.normalizedRadius):0))*width} y={(Number(d.normalizedY)-(d.shapeType==='circle'?Number(d.normalizedRadius):0))*height} text={String(d.differenceNumber)} fontSize={15} fontStyle="bold" fill="#d8ff52" padding={6}/>)}
  </Layer></Stage>;
}
