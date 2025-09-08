const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

async function analyzeUploadedFile() {
  try {
    console.log('🔍 업로드된 파일 분석 시작...\n')
    
    const filePath = path.join(__dirname, '..', 'data', 'Video_List_20250604-20250831_20250902023532.xlsx')
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      console.error('❌ 파일을 찾을 수 없습니다:', filePath)
      return
    }
    
    console.log('📁 파일 정보:')
    console.log(`   - 파일명: Video_List_20250604-20250831_20250902023532.xlsx`)
    console.log(`   - 파일 경로: ${filePath}`)
    
    // 파일 크기 확인
    const stats = fs.statSync(filePath)
    console.log(`   - 파일 크기: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    
    // Excel 파일 읽기
    console.log('\n📊 Excel 파일 읽기 중...')
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    
    console.log(`   - 시트명: ${sheetName}`)
    console.log(`   - 총 행 수: ${jsonData.length}개`)
    
    if (jsonData.length === 0) {
      console.log('⚠️  데이터가 없습니다.')
      return
    }
    
    // 컬럼명 확인
    console.log('\n📋 컬럼명 확인:')
    const columns = Object.keys(jsonData[0])
    console.log(`   - 총 컬럼 수: ${columns.length}개`)
    columns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col}`)
    })
    
    // 필수 컬럼 확인
    const requiredColumns = ['Video name', 'Video link', 'Creator username', 'GMV']
    const missingColumns = requiredColumns.filter(col => !columns.includes(col))
    
    if (missingColumns.length > 0) {
      console.log(`\n⚠️  필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`)
      return
    }
    
    // 데이터 분석
    console.log('\n📊 데이터 분석 중...')
    
    // 1. 총 발행 수 (video_link 기준 중복 제거)
    const videoLinkSet = new Set()
    const uniqueVideos = []
    
    jsonData.forEach(row => {
      const videoLink = row['Video link']
      if (videoLink && !videoLinkSet.has(videoLink)) {
        videoLinkSet.add(videoLink)
        uniqueVideos.push(row)
      }
    })
    
    console.log(`   - 원본 데이터: ${jsonData.length}개`)
    console.log(`   - 중복 제거 후: ${uniqueVideos.length}개`)
    console.log(`   - 중복 제거됨: ${jsonData.length - uniqueVideos.length}개`)
    
    // 2. Total GMV
    const totalGmv = uniqueVideos.reduce((sum, row) => {
      const gmv = parseFloat(row['GMV']) || 0
      return sum + gmv
    }, 0)
    
    console.log(`   - 총 GMV: ${totalGmv.toFixed(2)}`)
    
    // 3. 크리에이터 수
    const creatorSet = new Set()
    uniqueVideos.forEach(row => {
      const creator = row['Creator username']
      if (creator && creator.trim() !== '') {
        creatorSet.add(creator.trim())
      }
    })
    
    console.log(`   - 유니크 크리에이터 수: ${creatorSet.size}명`)
    
    // 4. 총 노출 수 (Shoppable video impressions)
    const totalImpressions = uniqueVideos.reduce((sum, row) => {
      const impressions = parseInt(row['Shoppable video impressions']) || 0
      return sum + impressions
    }, 0)
    
    console.log(`   - 총 노출 수: ${totalImpressions.toLocaleString()}`)
    
    // 5. 총 좋아요 수 (Shoppable video likes)
    const totalLikes = uniqueVideos.reduce((sum, row) => {
      const likes = parseInt(row['Shoppable video likes']) || 0
      return sum + likes
    }, 0)
    
    console.log(`   - 총 좋아요 수: ${totalLikes.toLocaleString()}`)
    
    // 6. 추가 통계
    console.log('\n📈 추가 통계:')
    
    // GMV 분포
    const gmvStats = {
      zero: 0,
      low: 0,      // 0 < gmv <= 10
      medium: 0,   // 10 < gmv <= 100
      high: 0,     // 100 < gmv <= 1000
      veryHigh: 0  // gmv > 1000
    }
    
    uniqueVideos.forEach(row => {
      const gmv = parseFloat(row['GMV']) || 0
      if (gmv === 0) gmvStats.zero++
      else if (gmv <= 10) gmvStats.low++
      else if (gmv <= 100) gmvStats.medium++
      else if (gmv <= 1000) gmvStats.high++
      else gmvStats.veryHigh++
    })
    
    console.log(`   - GMV 0: ${gmvStats.zero}개`)
    console.log(`   - GMV 0-10: ${gmvStats.low}개`)
    console.log(`   - GMV 10-100: ${gmvStats.medium}개`)
    console.log(`   - GMV 100-1000: ${gmvStats.high}개`)
    console.log(`   - GMV 1000+: ${gmvStats.veryHigh}개`)
    
    // 상위 GMV 값들
    const sortedGmv = uniqueVideos
      .map(row => parseFloat(row['GMV']) || 0)
      .filter(gmv => gmv > 0)
      .sort((a, b) => b - a)
      .slice(0, 10)
    
    console.log('\n   상위 10개 GMV 값:')
    sortedGmv.forEach((gmv, index) => {
      console.log(`   ${index + 1}. ${gmv.toFixed(2)}`)
    })
    
    // 날짜 범위
    const dates = uniqueVideos
      .map(row => row['Video post date'])
      .filter(date => date)
      .map(date => new Date(date))
      .sort((a, b) => a - b)
    
    if (dates.length > 0) {
      console.log('\n   날짜 범위:')
      console.log(`   - 첫 게시일: ${dates[0].toISOString().split('T')[0]}`)
      console.log(`   - 마지막 게시일: ${dates[dates.length - 1].toISOString().split('T')[0]}`)
    }
    
    // 최종 요약
    console.log('\n' + '='.repeat(60))
    console.log('📋 업로드된 파일 분석 결과:')
    console.log('='.repeat(60))
    console.log(`🎬 총 발행 수 (중복 제거): ${uniqueVideos.length}개`)
    console.log(`💰 총 GMV: ${totalGmv.toFixed(2)}`)
    console.log(`👥 유니크 크리에이터 수: ${creatorSet.size}명`)
    console.log(`👁️  총 노출 수: ${totalImpressions.toLocaleString()}`)
    console.log(`❤️  총 좋아요 수: ${totalLikes.toLocaleString()}`)
    console.log('='.repeat(60))
    
    // DB와 비교
    console.log('\n🔍 DB와 비교:')
    console.log(`   - 파일 영상 수: ${uniqueVideos.length}개`)
    console.log(`   - DB 영상 수: 1942개`)
    console.log(`   - 차이: ${1942 - uniqueVideos.length}개`)
    console.log(`   - 파일 GMV: ${totalGmv.toFixed(2)}`)
    console.log(`   - DB GMV: 5274.76`)
    console.log(`   - 차이: ${(5274.76 - totalGmv).toFixed(2)}`)
    
  } catch (error) {
    console.error('❌ 파일 분석 중 오류 발생:', error)
  }
}

analyzeUploadedFile()

