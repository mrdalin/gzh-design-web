// 摸鱼绿主题官方标准排版样例（few-shot 参考，精简版）
// 保留：封面 / 目录 / 分章结构（大号数字 + PART 标签 + 标题 + 英文副标）/ 正文样式 / 结语 / 署名 / 互动三连。
// 省略：中间重复的章节内容，仅用于降低输入 token 消耗（不影响风格学习）。
export const MOYU_GREEN_SAMPLE = `<section style="max-width:677px;margin:0 auto;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#374151;line-height:1.75;letter-spacing:0.5px;overflow-x:hidden;">

  <!-- 1. 封面 cover-breaking（无右侧图片版） -->
  <section style="margin:0 0 32px;background:#fff;border:1.5px solid rgba(5,150,105,0.15);border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);width:100%;">
    <section style="padding:32px 28px 28px;">
      <section style="display:flex;align-items:center;gap:8px;margin-bottom:28px;">
        <span style="width:6px;height:6px;background:#059669;border-radius:50%;"><span leaf=""><br></span></span>
        <span style="font-size:11px;font-weight:700;letter-spacing:3px;color:#059669;"><span leaf="">SCIENCE · 深度科普</span></span>
        <section style="flex:1;height:1px;overflow:hidden;background:linear-gradient(to right,rgba(5,150,105,0.12),transparent);"><span leaf=""><br></span></section>
        <span style="font-size:10px;color:#D1D5DB;font-weight:600;"><span leaf="">2024.06</span></span>
      </section>
      <section>
        <p style="font-size:15px;color:#D1D5DB;margin:0 0 6px;text-decoration:line-through;letter-spacing:0.5px;">
          <span leaf="">台风只是狂风暴雨？</span>
        </p>
        <p style="font-size:24px;font-weight:900;color:#111827;margin:0;line-height:1.05;letter-spacing:-2px;">
          <span leaf="">当台风</span>
          <span style="color:#059669;"><span leaf="">红霞</span></span>
        </p>
        <p style="font-size:24px;font-weight:900;color:#059669;margin:0 0 16px;line-height:1.05;letter-spacing:-2px;">
          <span leaf="">遇上人类社会</span>
        </p>
        <section style="width:48px;height:3px;background:linear-gradient(to right,#059669,#34D399);border-radius:2px;margin-bottom:12px;">
          <span leaf=""><br></span>
        </section>
        <p style="font-size:13px;color:#9CA3AF;margin:0;line-height:1.7;letter-spacing:0.5px;">
          <span leaf="">形成机制 · 路径演变 · 防灾启示</span>
        </p>
      </section>
    </section>
    <section style="background:linear-gradient(135deg,#059669,#10B981);padding:12px 28px;display:flex;align-items:center;justify-content:space-between;">
      <p style="font-size:12px;color:rgba(255,255,255,0.9);margin:0;font-weight:600;letter-spacing:0.5px;">
        <span leaf="">Sapiens AI 原创科普</span>
      </p>
      <section style="display:flex;gap:4px;">
        <span style="background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:3px;font-size:8px;color:#fff;font-weight:600;"><span leaf="">气象</span></span>
        <span style="background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:3px;font-size:8px;color:#fff;font-weight:600;"><span leaf="">防灾</span></span>
      </section>
    </section>
  </section>

  <!-- 2. 目录 toc-scroll -->
  <section style="margin:0 20px 32px;">
    <section style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <p style="font-size:10px;color:#9CA3AF;margin:0;text-transform:uppercase;letter-spacing:2px;font-weight:600;">
        <span leaf="">📦 8 Parts + Conclusion</span>
      </p>
      <p style="font-size:10px;color:#9CA3AF;margin:0;">
        <span leaf="">👉 滑动</span>
      </p>
    </section>
    <section style="overflow-x:scroll;-webkit-overflow-scrolling:touch;white-space:nowrap;padding-bottom:8px;">
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:linear-gradient(135deg,#059669,#10B981);border-radius:12px;padding:12px;margin-right:8px;">
        <p style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART 01</span></p>
        <p style="font-size:13px;font-weight:800;color:#fff;margin:0 0 3px;"><span leaf="">什么是台风</span></p>
        <p style="font-size:10px;color:rgba(255,255,255,0.7);margin:0;"><span leaf="">气旋本质</span></p>
      </section>
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:12px;margin-right:8px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <p style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART 02</span></p>
        <p style="font-size:13px;font-weight:800;color:#111827;margin:0 0 3px;"><span leaf="">红霞登场</span></p>
        <p style="font-size:10px;color:#9CA3AF;margin:0;"><span leaf="">命名由来</span></p>
      </section>
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:12px;margin-right:8px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <p style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART 03</span></p>
        <p style="font-size:13px;font-weight:800;color:#111827;margin:0 0 3px;"><span leaf="">红霞的形成</span></p>
        <p style="font-size:10px;color:#9CA3AF;margin:0;"><span leaf="">三方协同</span></p>
      </section>
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:12px;margin-right:8px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <p style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART 04</span></p>
        <p style="font-size:13px;font-weight:800;color:#111827;margin:0 0 3px;"><span leaf="">路径追踪</span></p>
        <p style="font-size:10px;color:#9CA3AF;margin:0;"><span leaf="">抛物线轨迹</span></p>
      </section>
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:12px;margin-right:8px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <p style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART 05</span></p>
        <p style="font-size:13px;font-weight:800;color:#111827;margin:0 0 3px;"><span leaf="">灾害评估</span></p>
        <p style="font-size:10px;color:#9CA3AF;margin:0;"><span leaf="">损失数据</span></p>
      </section>
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:12px;margin-right:8px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <p style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART 06</span></p>
        <p style="font-size:13px;font-weight:800;color:#111827;margin:0 0 3px;"><span leaf="">科技赋能</span></p>
        <p style="font-size:10px;color:#9CA3AF;margin:0;"><span leaf="">监测技术</span></p>
      </section>
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:12px;margin-right:8px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <p style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART 07</span></p>
        <p style="font-size:13px;font-weight:800;color:#111827;margin:0 0 3px;"><span leaf="">气候新挑战</span></p>
        <p style="font-size:10px;color:#9CA3AF;margin:0;"><span leaf="">变暖趋势</span></p>
      </section>
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:12px;margin-right:8px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <p style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART 08</span></p>
        <p style="font-size:13px;font-weight:800;color:#111827;margin:0 0 3px;"><span leaf="">公众应对</span></p>
        <p style="font-size:10px;color:#9CA3AF;margin:0;"><span leaf="">自救清单</span></p>
      </section>
      <section style="display:inline-block;white-space:normal;vertical-align:top;width:110px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <p style="font-size:9px;font-weight:700;color:#9CA3AF;letter-spacing:1px;margin:0 0 5px;"><span leaf="">PART ///</span></p>
        <p style="font-size:13px;font-weight:800;color:#111827;margin:0 0 3px;"><span leaf="">写在最后</span></p>
        <p style="font-size:10px;color:#9CA3AF;margin:0;"><span leaf="">敬畏自然</span></p>
      </section>
    </section>
  </section>

  <!-- 3. 开头引言 oneliner-card -->
  <section style="padding:0 20px;">
    <section style="background:#FFF;border:1px dashed #BBF7D0;border-radius:8px;padding:14px 16px;margin-bottom:24px;text-align:center;">
      <p style="font-size:12px;color:#9CA3AF;margin:0 0 6px;line-height:1.5;">
        <span leaf="">一场关于自然与人类的科普之旅</span>
      </p>
      <p style="margin:0;line-height:1.6;">
        <span style="font-size:15px;color:#059669;font-weight:bold;border-bottom:3px solid #FDE68A;padding-bottom:2px;"><span leaf="">台风红霞，一次被低估的能量对话</span></span>
      </p>
    </section>
  </section>

  <!-- 4. 前言正文 -->
  <section style="padding:0 20px;">
    <p style="margin-bottom:24px;font-size:14px;line-height:1.9;text-align:justify;">
      <span leaf="">当夜幕低垂，海面泛起层层涟漪，天空中隐约可见一丝不寻常的旋涡——这不是科幻电影的场景，而是自然界中一场真实发生的震撼事件：</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">台风“红霞”</span></span><span leaf="">。今天，我们将从科学的角度深入剖析这场台风的</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">形成机制</span></span><span leaf="">、路径演变、影响范围以及它给人类社会带来的深远启示。这不仅是一次气象知识的科普之旅，更是一场对</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">人与自然关系</span></span><span leaf="">的深刻反思。</span>
    </p>
  </section>

  <!-- 5. 第一章 -->
  <section style="margin-top:16px;margin-bottom:32px;padding:0 20px;">
    <section style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <section style="text-align:center;flex-shrink:0;">
        <p style="margin:0;font-size:28px;font-weight:900;color:#059669;line-height:1;letter-spacing:-2px;"><span leaf="">01</span></p>
        <p style="margin:0;font-size:8px;font-weight:700;color:#D1D5DB;letter-spacing:2px;"><span leaf="">PART</span></p>
      </section>
      <span style="width:1px;height:36px;background:#E5E7EB;flex-shrink:0;"><span leaf=""><br></span></span>
      <section>
        <p style="margin:0 0 1px;font-size:17px;font-weight:900;color:#111827;letter-spacing:0.3px;"><span leaf="">什么是台风？</span></p>
        <p style="margin:0;font-size:11px;font-weight:600;color:#9CA3AF;letter-spacing:1.5px;"><span leaf="">FROM CYCLONE TO STORM</span></p>
      </section>
    </section>
  </section>
  <section style="padding:0 20px;">
    <p style="margin-bottom:16px;font-size:14px;line-height:1.9;text-align:justify;">
      <span leaf="">在讨论“红霞”之前，我们需要先了解台风的本质。</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">台风是热带气旋的一种强盛形式</span></span><span leaf="">，其核心特征是在</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">低压中心</span></span><span leaf="">伴随强烈的对流活动和持续风速超过每秒32米（即12级风以上）。根据</span><strong style="color:#059669;"><span leaf="">世界气象组织（WMO）</span></strong><span leaf="">的定义，当西北太平洋地区的台风中心附近最大持续风力达到或超过64节（约33米/秒）时，便正式被命名并发布预警。</span>
    </p>
    <section style="background:#F9FAFB;border:1px dashed #D1D5DB;border-radius:8px;padding:12px 16px;margin-bottom:24px;text-align:justify;">
      <p style="font-size:13px;color:#374151;margin:0;line-height:1.6;">
        <span leaf="">“台风不是单纯的‘狂风暴雨’，而是一个庞大而精密的</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">能量转换系统</span></span><span leaf="">。”</span>
      </p>
      <p style="font-size:12px;color:#9CA3AF;margin:8px 0 0;line-height:1.6;">
        <span leaf="">—— 中国科学院大气物理研究所 刘明教授</span>
      </p>
    </section>
  </section>

  <!-- 6. 第二章 -->
  <section style="margin-top:48px;margin-bottom:32px;padding:0 20px;">
    <section style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <section style="text-align:center;flex-shrink:0;">
        <p style="margin:0;font-size:28px;font-weight:900;color:#059669;line-height:1;letter-spacing:-2px;"><span leaf="">02</span></p>
        <p style="margin:0;font-size:8px;font-weight:700;color:#D1D5DB;letter-spacing:2px;"><span leaf="">PART</span></p>
      </section>
      <span style="width:1px;height:36px;background:#E5E7EB;flex-shrink:0;"><span leaf=""><br></span></span>
      <section>
        <p style="margin:0 0 1px;font-size:17px;font-weight:900;color:#111827;letter-spacing:0.3px;"><span leaf="">“红霞”登场：台风命名的起源与意义</span></p>
        <p style="margin:0;font-size:11px;font-weight:600;color:#9CA3AF;letter-spacing:1.5px;"><span leaf="">NAMING &amp; ORIGIN</span></p>
      </section>
    </section>
  </section>
  <section style="padding:0 20px;">
    <p style="margin-bottom:16px;font-size:14px;line-height:1.9;text-align:justify;">
      <span leaf="">“红霞”并非虚构名称，而是由</span><strong style="color:#059669;"><span leaf="">日本气象厅（JMA）</span></strong><span leaf="">于2024年夏季正式命名的第7号超强台风。其英文名为 Roksa，源自朝鲜语“홍삭”（Hongsak），意为“清晨的红霞”，象征着新生与希望。有趣的是，这一名称寓意深刻——尽管台风带来破坏，但它在</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">生态循环</span></span><span leaf="">中也扮演着关键角色：台风通过释放大量水汽和调节温度，有助于</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">缓解区域干旱与热岛效应</span></span><span leaf="">。</span>
    </p>
    <section style="margin-bottom:24px;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr>
            <th style="background:#059669;color:#fff;font-weight:700;padding:8px 12px;text-align:left;"><span leaf="">参数</span></th>
            <th style="background:#059669;color:#fff;font-weight:700;padding:8px 12px;text-align:left;"><span leaf="">数值</span></th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#374151;"><span leaf="">生成时间</span></td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#374151;"><span leaf="">2024年6月12日 08:00 UTC</span></td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#374151;background:#F9FAFB;"><span leaf="">登陆地点</span></td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#374151;background:#F9FAFB;"><span leaf="">台湾宜兰县苏澳镇</span></td></tr>
          <tr><td style="padding:8px 

  <!-- 中间章节为重复结构，已省略以节省 token；上述 PART 目录 + 分章样式已足够模型学习结构 -->

00;color:#111827;letter-spacing:0.3px;"><span leaf="">写在最后</span></p>
        <p style="margin:0;font-size:11px;font-weight:600;color:#9CA3AF;letter-spacing:1.5px;"><span leaf="">EPILOGUE · 敬畏自然</span></p>
      </section>
    </section>
  </section>
  <section style="padding:0 20px;">
    <p style="margin-bottom:16px;font-size:14px;line-height:1.9;text-align:justify;">
      <span leaf="">“红霞”终将远去，但它留给我们的思考却久久回荡。这场大自然的怒吼提醒着我们：人类文明虽已高度发达，但在浩瀚宇宙面前依然渺小脆弱。真正的强大，不是征服自然，而是学会与之</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">和谐共处</span></span><span leaf="">；不是追求短期增长，而是构建能够</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">承受冲击的社会体系</span></span><span leaf="">。</span>
    </p>
    <p style="margin-bottom:24px;font-size:14px;line-height:1.9;text-align:justify;">
      <span leaf="">当我们仰望星空，感叹风雨无情之时，也请记住：每一道彩虹的背后，都是阳光穿过雨滴折射出的美丽；每一次灾难过后，都会孕育出新的秩序与希望。让我们以科学为指导，以责任为基石，共同打造一个</span><span style="border-bottom:2px solid #A7F3D0;font-weight:600;"><span leaf="">更具韧性的世界</span></span><span leaf="">——那里，台风或许依旧存在，但人类不再无助。</span>
    </p>
    <p style="font-size:14px;margin-bottom:20px;text-align:center;color:#059669;font-weight:700;letter-spacing:1px;border-top:1px solid #F3F4F6;border-bottom:1px solid #F3F4F6;padding:12px 0;">
      <span leaf="">敬畏自然，携手共筑韧性社会</span>
    </p>
  </section>

  <!-- 14. 署名（沿用原文品牌署名） -->
  <p style="margin:0 20px 16px;font-size:13px;color:#9CA3AF;line-height:1.8;text-align:center;">
    <span leaf="">本文基于公开气象资料整理撰写，数据来源包括 JMA、CMA、ECMWF、NASA 及联合国减灾署报告。</span>
  </p>
  <p style="margin:0 20px 24px;font-size:13px;color:#9CA3AF;line-height:1.8;text-align:center;">
    <span leaf="">转载请注明出处：【Sapiens AI 原创科普专栏】</span>
  </p>

  <!-- 15. 互动三连 footer-cta -->
  <section style="background:radial-gradient(circle at center,#F9FAFB 0%,#FFFFFF 100%);border:1px solid #E5E7EB;border-radius:16px;padding:32px 20px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.03);margin:0 0 24px;">
    <p style="font-size:13px;font-weight:bold;color:#111827;margin-bottom:20px;line-height:1.6;">
      <span leaf="">既然看到这里了，如果觉得有用，随手点个赞、在看、转发三连吧。</span>
    </p>
    <section style="display:flex;justify-content:center;gap:24px;margin-bottom:16px;">
      <section style="text-align:center;cursor:pointer;color:#4B5563;">
        <section style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;background:#fff;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.05);border:1px solid #F3F4F6;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
        </section>
        <span style="font-size:10px;font-weight:600;"><span leaf="">点赞</span></span>
      </section>
      <section style="text-align:center;cursor:pointer;color:#4B5563;">
        <section style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;background:#fff;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.05);border:1px solid #F3F4F6;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"></circle><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path></svg>
        </section>
        <span style="font-size:10px;font-weight:600;"><span leaf="">在看</span></span>
      </section>
      <section style="text-align:center;cursor:pointer;color:#059669;">
        <section style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;background:#ECFDF5;border-radius:12px;box-shadow:0 2px 4px rgba(5,150,105,0.15);border:1px solid #A7F3D0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18v-4a8 8 0 0 1 8-8h8"></path><polyline points="16 2 20 6 16 10"></polyline></svg>
        </section>
        <span style="font-size:10px;font-weight:600;"><span leaf="">转发</span></span>
      </section>
    </section>
    <p style="font-size:10px;color:#9CA3AF;letter-spacing:1px;margin:0;">
      <span leaf="">THANKS FOR READING</span>
    </p>
  </section>

</section>
`;
