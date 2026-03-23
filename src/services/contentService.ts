export interface ContentPayload {
  instagram: string;
  tiktok: string;
  twitter: string;
}

/**
 * Simula a chamada de uma API de IA (ex: OpenAI gpt-4o, Meta Llama-3, ou Claude-3.5)
 * Parametrizada por persona estrita do Governo.
 */
export async function generateCampaignScripts(fact: string): Promise<ContentPayload> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        instagram: `🚀 ACOMPANHA SÓ PRA ONDE VAMOS AVANÇAR!\n\nHoje é um dia histórico! Sobre: "${fact}", provamos mais uma vez que o nosso RS não para! A energia do povo, a união e a entrega não deixam mentir: o trabalho vence qualquer obstáculo. 💛💚❤️\n\n#OTrabalhoVence #CampanhaDigital2026 #RioGrandeDoSul #AvanteSempre`,
        
        tiktok: `[Abre câmera no estilo selfie ou drone filmando obra]\n\n"Fala galera, vocês já viram o que acabou de rolar? Rápido, direto ao ponto: ${fact}. Menos promessa e muito, MUITO mais entrega técnica. Confere aí as imagens de trás [aponta para trás]. É esse o Estado de verdade!"\n\n[Música: Trend Upbeat / Dinâmica]`,
        
        twitter: `Informamos com a máxima transparência institucional que: ${fact}. O compromisso técnico e fiscal do Governo Estadual segue as diretrizes da LDO vigente, focado sempre em sanar problemas reais da população. Gestão responsável se faz com números. 📊🤝 #GestãoRS #PortoAlegre #Piratini`
      });
    }, 1500); // Simulando delay do LLM
  });
}

/**
 * Simula uma API de Diffusão (Estabilidade XL, DALL-E 3, Midjourney)
 * com filtro pré-definido.
 */
export async function generateBrandedImage(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Como não podemos chamar APIs reais sem custo, retornamos um placeholder estilento
      // da Unsplash, fingindo ser a geração baseada no Prompt
      const query = prompt.toLowerCase().includes('ponte') || prompt.toLowerCase().includes('estrada') 
        ? 'highway,bridge,sunset' 
        : 'crowd,event,sunlight';
      
      resolve(`https://images.unsplash.com/photo-1541888031307-e1792942afc8?q=80&w=600&auto=format&fit=crop&${query}`);
    }, 2000); 
  });
}

/**
 * Mock da "Biblioteca Local" do Storage do Firebase para a PWA Offline.
 */
export async function fetchCampaignAssets() {
  return [
    { id: 'logo-primaria', url: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop', type: 'logo' },
    { id: 'candidato-oficial-1', url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=200&auto=format&fit=crop', type: 'photo' },
    { id: 'bandeira-rs', url: 'https://images.unsplash.com/photo-1579273166152-d725a4e2b755?q=80&w=200&auto=format&fit=crop', type: 'asset' }
  ];
}
