# Cache pattern 3 แบบ ด้วย Express, MySQL และ Redis

ในนี้เราจะมีการพูดถึง cache design pattern ทั้งหมด 3 วิธีคือ
1. Lazy loading (Cache aside) = ตอนเรียกใช้ เจอ cache ใช้ cache, ไม่เจอ cache เขียนใหม่ให้ด้วย
2. Write through = update ข้อมูลตอนไหน เขียน cache ให้ด้วย (จะได้เอาไปใช้ตอนเรียกได้)
3. Write back = ทุกอย่างใส่ cache และค่อยหาเวลากลับไปเขียน database อีกที

## วิธี run project

1. เปิด MySQL, redis, phpmyadmin ด้วย docker-compose

```shell
docker-compose up -d
```

จะได้ container 3 ตัวอกมา

2. run project node ด้วย

```shell
npm start
```

- project จะ run ออกมาที่ port 8000
- phpmyadmin จะ run ออกมาที่ port 8080 (ใช้สำหรับ management MySQL)

### ดู video การทดลองได้ที่

[![cache-design-pattern](https://img.youtube.com/vi/LW65eQ2SFJU/0.jpg)](https://youtu.be/LW65eQ2SFJU)

### อ่านฉบับบทความได้ที่
https://docs.mikelopster.dev/blog/cache-pattern