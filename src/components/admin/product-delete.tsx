"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function ProductDelete({ id, name, detail = false }: { id: string; name: string; detail?: boolean }) {
 const [open,setOpen] = useState(false);
 const [state,action,pending] = useActionState(deleteProduct, {});
 const router = useRouter();
 useEffect(() => { if(state.ok) { toast.success("Product permanently deleted"); if(detail) router.push("/admin/products"); else router.refresh(); } },[state,router,detail]);
 return <>
  <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Delete ${name}`} title="Delete product" onClick={()=>setOpen(true)}><X className="size-4" /></Button>
  <Dialog open={open && !state.ok} onOpenChange={value=>{if(!pending)setOpen(value)}}>
   <DialogContent showCloseButton={!pending}>
    <DialogTitle>Delete {name}?</DialogTitle>
    <DialogDescription>This permanently deletes the product, its versions, barcodes and photos. This cannot be undone. Products linked to inventory, box lineups or shipments cannot be deleted.</DialogDescription>
    <form action={action}>
     <input type="hidden" name="id" value={id}/><input type="hidden" name="confirmed" value="yes"/>
     {state.error && <p role="alert" className="mb-4 text-sm text-destructive">{state.error}</p>}
     <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" variant="destructive" disabled={pending}>{pending ? "Deleting…" : "Delete permanently"}</Button></DialogFooter>
    </form>
   </DialogContent>
  </Dialog>
 </>;
}
