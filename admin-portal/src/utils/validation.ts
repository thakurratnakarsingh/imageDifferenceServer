export function canApprove(validationStatus:string, activeDifferenceCount:number, hasModifiedImage:boolean){
  return validationStatus==='passed'&&activeDifferenceCount===10&&hasModifiedImage;
}
