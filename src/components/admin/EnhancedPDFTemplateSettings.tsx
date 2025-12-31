import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Check, Upload, X, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const PDF_FONTS = [
  "TimesRoman",
  "TimesRomanBold",
  "TimesRomanItalic",
  "Helvetica",
  "HelveticaBold",
  "Courier"
];

export const EnhancedPDFTemplateSettings = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('pdf_templates' as any)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
      const activeTemplate = (data as any[])?.find((t: any) => t.is_active) || data?.[0];
      setSelectedTemplate(activeTemplate);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    const { error } = await supabase
      .from('pdf_templates' as any)
      .update(selectedTemplate as any)
      .eq('id', selectedTemplate.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "PDF template updated successfully" });
      loadTemplates();
    }
    setSaving(false);
  };

  const handleActivate = async (templateId: string) => {
    // Deactivate all templates
    await supabase.from('pdf_templates' as any).update({ is_active: false } as any).neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Activate selected template
    const { error } = await supabase
      .from('pdf_templates' as any)
      .update({ is_active: true } as any)
      .eq('id', templateId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Activated", description: "Template is now active for exports" });
      loadTemplates();
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate) return;
    const { id, created_at, updated_at, ...templateData } = selectedTemplate;
    const { error } = await supabase
      .from('pdf_templates' as any)
      .insert({ ...templateData, template_name: `${templateData.template_name} (Copy)`, is_active: false } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Duplicated", description: "Template duplicated successfully" });
      loadTemplates();
    }
  };

  const handleDelete = async (templateId: string) => {
    const { error } = await supabase
      .from('pdf_templates' as any)
      .delete()
      .eq('id', templateId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Template deleted successfully" });
      loadTemplates();
    }
  };

  const updateField = (field: string, value: any) => {
    setSelectedTemplate({ ...selectedTemplate, [field]: value });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string = 'logo_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 2MB", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pdf-template-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('pdf-template-assets')
        .getPublicUrl(filePath);

      updateField(field, urlData.publicUrl);
      const uploadType = field === 'logo_url' ? 'Logo' : 'Background image';
      toast({ title: "Success", description: `${uploadType} uploaded successfully` });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!selectedTemplate?.logo_url) return;

    try {
      // Extract file path from URL
      const url = new URL(selectedTemplate.logo_url);
      const filePath = url.pathname.split('/').slice(-2).join('/');

      const { error } = await supabase.storage
        .from('pdf-template-assets')
        .remove([filePath]);

      if (error) throw error;

      updateField('logo_url', null);
      toast({ title: "Success", description: "Logo removed successfully" });
    } catch (error: any) {
      console.error('Logo removal error:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleGeneratePreview = async () => {
    if (!selectedTemplate) return;
    
    setGeneratingPreview(true);
    try {
      // First save the template if needed
      if (saving) {
        await handleSave();
      }
      
      // Find a sample codex to generate preview
      const { data: codexes } = await supabase
        .from('codexes')
        .select('id')
        .limit(1)
        .single();
      
      if (!codexes) {
        toast({ 
          title: "No Data", 
          description: "No codex available for preview. Generate a persona run first.",
          variant: "destructive" 
        });
        setGeneratingPreview(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-codex-pdf', {
        body: { codexId: codexes.id }
      });
      
      if (error) throw error;
      
      // Convert base64 to blob and open in new tab
      const pdfBlob = await fetch(`data:application/pdf;base64,${data.pdf}`).then(res => res.blob());
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
      toast({ title: "Preview Generated", description: "PDF preview opened in new tab" });
    } catch (error: any) {
      toast({ 
        title: "Preview Failed", 
        description: error.message || "Failed to generate preview",
        variant: "destructive" 
      });
    } finally {
      setGeneratingPreview(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PDF Export Templates</CardTitle>
          <CardDescription>Customize how codex PDFs are generated for all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedTemplate?.id} onValueChange={(id) => setSelectedTemplate(templates.find(t => t.id === id))}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name} {template.is_active && "✓ Active"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleDuplicate} variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {selectedTemplate && (
            <>
              <div className="grid gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input value={selectedTemplate.template_name} onChange={(e) => updateField('template_name', e.target.value)} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active Template</Label>
                  <Switch 
                    checked={selectedTemplate.is_active} 
                    onCheckedChange={() => handleActivate(selectedTemplate.id)}
                  />
                </div>

                {/* Logo Upload Section */}
                <div className="border rounded-lg p-4 space-y-3">
                  <Label>Template Logo</Label>
                  <p className="text-sm text-muted-foreground">Upload a logo to display on PDF exports (max 2MB)</p>
                  
                  {selectedTemplate.logo_url ? (
                    <div className="space-y-3">
                      <div className="relative w-48 h-48 border rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={selectedTemplate.logo_url} 
                          alt="Template logo" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={uploadingLogo}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Replace Logo
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveLogo}
                          disabled={uploadingLogo}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-48 h-48 border-2 border-dashed rounded-lg bg-muted/50">
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Logo
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>

                {/* Company Branding */}
                <div>
                  <Label>Company Name</Label>
                  <Input 
                    value={selectedTemplate.company_name || ''} 
                    onChange={(e) => updateField('company_name', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>

                {/* Header/Footer Options */}
                <div className="border rounded-lg p-4 space-y-3">
                  <Label>PDF Layout Options</Label>
                  
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Show Header</Label>
                    <Switch 
                      checked={selectedTemplate.show_header ?? true} 
                      onCheckedChange={(val) => updateField('show_header', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Show Footer</Label>
                    <Switch 
                      checked={selectedTemplate.show_footer ?? true} 
                      onCheckedChange={(val) => updateField('show_footer', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Show Page Numbers</Label>
                    <Switch 
                      checked={selectedTemplate.show_page_numbers ?? true} 
                      onCheckedChange={(val) => updateField('show_page_numbers', val)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Show Table of Contents</Label>
                    <Switch 
                      checked={selectedTemplate.show_toc ?? true} 
                      onCheckedChange={(val) => updateField('show_toc', val)}
                    />
                  </div>
                </div>

                {/* Cover Page Customization */}
                <div className="border rounded-lg p-4 space-y-3">
                  <Label>Cover Page Customization</Label>
                  
                  <div className="flex items-center justify-between">
                    <Label className="font-normal">Show Cover Page</Label>
                    <Switch 
                      checked={selectedTemplate.show_cover_page ?? true} 
                      onCheckedChange={(val) => updateField('show_cover_page', val)}
                    />
                  </div>

                  {selectedTemplate.show_cover_page && (
                    <>
                      <div>
                        <Label>Subtitle Text (optional)</Label>
                        <Input 
                          value={selectedTemplate.cover_subtitle || ''} 
                          onChange={(e) => updateField('cover_subtitle', e.target.value)}
                          placeholder="e.g., Professional Development Plan"
                        />
                      </div>

                      <div>
                        <Label>Background Color</Label>
                        <div className="flex gap-2 items-center">
                          <Input 
                            type="color" 
                            value={`#${Math.round((selectedTemplate.cover_bg_color_r ?? 1) * 255).toString(16).padStart(2, '0')}${Math.round((selectedTemplate.cover_bg_color_g ?? 1) * 255).toString(16).padStart(2, '0')}${Math.round((selectedTemplate.cover_bg_color_b ?? 1) * 255).toString(16).padStart(2, '0')}`}
                            onChange={(e) => {
                              const hex = e.target.value;
                              const r = parseInt(hex.slice(1, 3), 16) / 255;
                              const g = parseInt(hex.slice(3, 5), 16) / 255;
                              const b = parseInt(hex.slice(5, 7), 16) / 255;
                              setSelectedTemplate({
                                ...selectedTemplate,
                                cover_bg_color_r: r,
                                cover_bg_color_g: g,
                                cover_bg_color_b: b
                              });
                            }}
                            className="w-20 h-10 cursor-pointer"
                          />
                          <span className="text-sm text-muted-foreground">
                            RGB({Math.round((selectedTemplate.cover_bg_color_r ?? 1) * 255)}, {Math.round((selectedTemplate.cover_bg_color_g ?? 1) * 255)}, {Math.round((selectedTemplate.cover_bg_color_b ?? 1) * 255)})
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label>Background Image (optional)</Label>
                        <p className="text-sm text-muted-foreground mb-2">Upload a background image for the cover page</p>
                        
                        {selectedTemplate.cover_bg_image_url ? (
                          <div className="space-y-3">
                            <div className="relative w-48 h-32 border rounded-lg overflow-hidden bg-muted">
                              <img 
                                src={selectedTemplate.cover_bg_image_url} 
                                alt="Cover background" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('cover-bg-upload')?.click()}
                                disabled={uploadingLogo}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Replace Image
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => updateField('cover_bg_image_url', null)}
                                disabled={uploadingLogo}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById('cover-bg-upload')?.click()}
                            disabled={uploadingLogo}
                          >
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Background
                              </>
                            )}
                          </Button>
                        )}
                        
                        <input
                          id="cover-bg-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'cover_bg_image_url')}
                          className="hidden"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title Font</Label>
                    <Select value={selectedTemplate.title_font} onValueChange={(val) => updateField('title_font', val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PDF_FONTS.map(font => <SelectItem key={font} value={font}>{font}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Body Font</Label>
                    <Select value={selectedTemplate.body_font} onValueChange={(val) => updateField('body_font', val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PDF_FONTS.map(font => <SelectItem key={font} value={font}>{font}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Title Font Size</Label>
                    <Input type="number" value={selectedTemplate.title_font_size} onChange={(e) => updateField('title_font_size', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label>Heading Font Size</Label>
                    <Input type="number" value={selectedTemplate.heading_font_size} onChange={(e) => updateField('heading_font_size', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label>Body Font Size</Label>
                    <Input type="number" value={selectedTemplate.body_font_size} onChange={(e) => updateField('body_font_size', parseInt(e.target.value))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Page Margin</Label>
                    <Input type="number" value={selectedTemplate.page_margin} onChange={(e) => updateField('page_margin', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label>Line Spacing</Label>
                    <Input type="number" value={selectedTemplate.line_spacing} onChange={(e) => updateField('line_spacing', parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label>Section Spacing</Label>
                    <Input type="number" value={selectedTemplate.section_spacing} onChange={(e) => updateField('section_spacing', parseInt(e.target.value))} />
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label>Title Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="color" 
                        value={`#${Math.round(selectedTemplate.title_color_r * 255).toString(16).padStart(2, '0')}${Math.round(selectedTemplate.title_color_g * 255).toString(16).padStart(2, '0')}${Math.round(selectedTemplate.title_color_b * 255).toString(16).padStart(2, '0')}`}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1, 3), 16) / 255;
                          const g = parseInt(hex.slice(3, 5), 16) / 255;
                          const b = parseInt(hex.slice(5, 7), 16) / 255;
                          setSelectedTemplate({
                            ...selectedTemplate,
                            title_color_r: r,
                            title_color_g: g,
                            title_color_b: b
                          });
                        }}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        RGB({Math.round(selectedTemplate.title_color_r * 255)}, {Math.round(selectedTemplate.title_color_g * 255)}, {Math.round(selectedTemplate.title_color_b * 255)})
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Heading Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="color" 
                        value={`#${Math.round(selectedTemplate.heading_color_r * 255).toString(16).padStart(2, '0')}${Math.round(selectedTemplate.heading_color_g * 255).toString(16).padStart(2, '0')}${Math.round(selectedTemplate.heading_color_b * 255).toString(16).padStart(2, '0')}`}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1, 3), 16) / 255;
                          const g = parseInt(hex.slice(3, 5), 16) / 255;
                          const b = parseInt(hex.slice(5, 7), 16) / 255;
                          setSelectedTemplate({
                            ...selectedTemplate,
                            heading_color_r: r,
                            heading_color_g: g,
                            heading_color_b: b
                          });
                        }}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        RGB({Math.round(selectedTemplate.heading_color_r * 255)}, {Math.round(selectedTemplate.heading_color_g * 255)}, {Math.round(selectedTemplate.heading_color_b * 255)})
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label>Body Text Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="color" 
                        value={`#${Math.round(selectedTemplate.body_color_r * 255).toString(16).padStart(2, '0')}${Math.round(selectedTemplate.body_color_g * 255).toString(16).padStart(2, '0')}${Math.round(selectedTemplate.body_color_b * 255).toString(16).padStart(2, '0')}`}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const r = parseInt(hex.slice(1, 3), 16) / 255;
                          const g = parseInt(hex.slice(3, 5), 16) / 255;
                          const b = parseInt(hex.slice(5, 7), 16) / 255;
                          setSelectedTemplate({
                            ...selectedTemplate,
                            body_color_r: r,
                            body_color_g: g,
                            body_color_b: b
                          });
                        }}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        RGB({Math.round(selectedTemplate.body_color_r * 255)}, {Math.round(selectedTemplate.body_color_g * 255)}, {Math.round(selectedTemplate.body_color_b * 255)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save Template
                </Button>
                <Button onClick={handleGeneratePreview} disabled={generatingPreview || saving} variant="outline">
                  {generatingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                  Preview PDF
                </Button>
                {!selectedTemplate.is_active && (
                  <Button onClick={() => handleDelete(selectedTemplate.id)} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
