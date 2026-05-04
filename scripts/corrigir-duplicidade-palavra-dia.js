const fs = require('fs')
const path = require('path')

const filePath = path.join(
  process.cwd(),
  'app',
  'admin',
  'novo-episodio',
  'page.tsx'
)

let content = fs.readFileSync(filePath, 'utf8')

const oldBlock = `        const { error: quoteError } = await supabase
          .from('daily_quotes')
          .insert([
            {
              episode_id: newEpisode.id,
              quote_text: selectedDailyQuote.trim(),
              background_image_url:
                selectedCard?.source_image_url || finalImageUrl || selectedSeriesImage || null,
              card_image_url: finalCardImageUrl,
              date: quoteDate,
              status: quoteStatus,
              scheduled_publish_at: scheduledPublishAt,
              published_at: quoteStatus === 'published' ? new Date().toISOString() : null,
              source_type: hasQuoteSuggestions ? 'ai_suggested' : 'manual',
              ai_suggestions: hasQuoteSuggestions ? quoteSuggestions : null,
              selected_suggestion_index: selectedSuggestionIndex,
              share_count: 0,
              like_count: 0,

              theme_keywords: selectedCard?.theme_keywords || null,
              source_image_provider: selectedCard?.source_image_provider || null,
              source_image_url: selectedCard?.source_image_url || null,
              selected_template: selectedCard?.template || null,
              generated_card_options:
                generatedCardOptionsForDb.length > 0 ? generatedCardOptionsForDb : null,
              card_generation_status: finalCardImageUrl
                ? 'completed'
                : cardOptions.length > 0
                ? 'completed'
                : 'not_started',
              card_generation_error: null,
              card_generated_at: finalCardImageUrl ? new Date().toISOString() : null,
              quote_background_id: selectedCard?.quote_background_id || null,
            },
          ])

        if (quoteError) throw quoteError`

const newBlock = `        const quotePayload = {
          episode_id: newEpisode.id,
          quote_text: selectedDailyQuote.trim(),
          background_image_url:
            selectedCard?.source_image_url || finalImageUrl || selectedSeriesImage || null,
          card_image_url: finalCardImageUrl,
          date: quoteDate,
          status: quoteStatus,
          scheduled_publish_at: scheduledPublishAt,
          published_at: quoteStatus === 'published' ? new Date().toISOString() : null,
          source_type: hasQuoteSuggestions ? 'ai_suggested' : 'manual',
          ai_suggestions: hasQuoteSuggestions ? quoteSuggestions : null,
          selected_suggestion_index: selectedSuggestionIndex,
          share_count: 0,
          like_count: 0,

          theme_keywords: selectedCard?.theme_keywords || null,
          source_image_provider: selectedCard?.source_image_provider || null,
          source_image_url: selectedCard?.source_image_url || null,
          selected_template: selectedCard?.template || null,
          generated_card_options:
            generatedCardOptionsForDb.length > 0 ? generatedCardOptionsForDb : null,
          card_generation_status: finalCardImageUrl
            ? 'completed'
            : cardOptions.length > 0
            ? 'completed'
            : 'not_started',
          card_generation_error: null,
          card_generated_at: finalCardImageUrl ? new Date().toISOString() : null,
          quote_background_id: selectedCard?.quote_background_id || null,
        }

        const { data: existingDailyQuote, error: existingDailyQuoteError } = await supabase
          .from('daily_quotes')
          .select('id, date, quote_text')
          .eq('date', quoteDate)
          .maybeSingle()

        if (existingDailyQuoteError) throw existingDailyQuoteError

        if (existingDailyQuote?.id) {
          const shouldReplace = window.confirm(
            'Já existe uma Palavra do Dia para esta data. Deseja substituir pela nova?'
          )

          if (shouldReplace) {
            const { error: updateQuoteError } = await supabase
              .from('daily_quotes')
              .update(quotePayload)
              .eq('id', existingDailyQuote.id)

            if (updateQuoteError) throw updateQuoteError
          }
        } else {
          const { error: quoteError } = await supabase
            .from('daily_quotes')
            .insert([quotePayload])

          if (quoteError) throw quoteError
        }`

if (!content.includes(oldBlock)) {
  console.error('❌ Não encontrei o bloco antigo de insert da daily_quotes.')
  console.error('O arquivo pode estar diferente. Não fiz alteração.')
  process.exit(1)
}

content = content.replace(oldBlock, newBlock)

fs.writeFileSync(filePath, content, 'utf8')

console.log('✅ Correção aplicada.')
console.log('Agora, se já existir Palavra do Dia na data, o app perguntará se deseja substituir.')