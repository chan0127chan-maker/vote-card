export class SealVersion{
 revision=0;lock=null;
 ticket(){return this.revision;}
 edit(){if(this.lock)return false;this.revision++;return true;}
 unlock(){if(!this.lock)return false;this.revision++;this.lock=null;return true;}
 commit(ticket,metadata){if(ticket!==this.revision)return false;this.lock={...metadata};return true;}
}
